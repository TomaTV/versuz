#!/usr/bin/env node
import "./_env.mjs";

/**
 * Backfill `license_spdx` on skills + claude_md_files by hitting the
 * GitHub repo API and reading `license.spdx_id`. Use this when scrapers
 * have written items without a license stamp (older scraper versions,
 * CLI submits, manual claims, etc.).
 *
 * Idempotent : only fetches for rows where `license_spdx IS NULL`. Caches
 * the result per `owner/repo` so 100 skills from the same repo hit the
 * GitHub API once.
 *
 * Usage :
 *   node scripts/backfill-licenses.mjs                 # dry run preview
 *   node scripts/backfill-licenses.mjs --apply         # commit
 *   node scripts/backfill-licenses.mjs --kind=skill --apply
 *   node scripts/backfill-licenses.mjs --batch=500     # larger batches
 *
 * Multi-token rotation via GITHUB_TOKENS env (comma-separated) to keep
 * within the 5000 req/hour per-token rate limit.
 */

import { createClient } from "@supabase/supabase-js";

function parseArgs() {
  const out = { kind: "both", apply: false, batch: 200 };
  for (const a of process.argv.slice(2)) {
    if (a === "--apply") out.apply = true;
    else if (a.startsWith("--kind=")) out.kind = a.slice(7);
    else if (a.startsWith("--batch=")) out.batch = Number(a.slice(8)) || 200;
  }
  return out;
}

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

// ─── GitHub multi-token rotation ────────────────────────────────────────
const TOKENS = (process.env.GITHUB_TOKENS || process.env.GITHUB_TOKEN || "")
  .split(/[,\s]+/)
  .filter(Boolean);
let tokenIdx = 0;
function nextToken() {
  if (TOKENS.length === 0) return null;
  const t = TOKENS[tokenIdx % TOKENS.length];
  tokenIdx += 1;
  return t;
}

// In-process cache : `${owner}/${repo}` → license spdx (or null if no license).
const licenseCache = new Map();

async function fetchRepoLicense(owner, repo) {
  const key = `${owner}/${repo}`;
  if (licenseCache.has(key)) return licenseCache.get(key);

  const token = nextToken();
  const headers = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (res.status === 404) {
      licenseCache.set(key, null);
      return null;
    }
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get("x-ratelimit-reset");
      console.warn(`  ⏸ rate-limited on ${key} (reset ${reset}) — using next token`);
      // Don't cache rate limit failures — retry on next call with rotated token
      return undefined;
    }
    if (!res.ok) {
      console.warn(`  ✗ ${key}: HTTP ${res.status}`);
      licenseCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const spdx = data?.license?.spdx_id || null;
    licenseCache.set(key, spdx);
    return spdx;
  } catch (err) {
    console.warn(`  ✗ ${key}: ${err.message}`);
    return undefined;
  }
}

async function backfillTable(sb, table, opts) {
  console.log(`\n[backfill] === ${table} ===`);

  const { count: total } = await sb
    .from(table)
    .select("id", { count: "exact", head: true })
    .is("license_spdx", null);
  console.log(`[backfill] ${total} rows with license_spdx NULL`);

  if (total === 0) return { processed: 0, updated: 0, no_license: 0 };

  let processed = 0;
  let updated = 0;
  let noLicense = 0;
  let cursor = null;
  // Parallelize : 20 workers consuming a per-batch queue. Each worker calls
  // fetchRepoLicense (which has its own per-owner/repo cache + token
  // rotation) + the UPDATE. The shared license cache + GitHub rate limit
  // headers prevent us from overloading the 5000 req/h × token budget.
  // Speedup ~ 15-20× vs sequential, bounded by GitHub rate limit.
  const CONCURRENCY = 20;

  while (true) {
    let q = sb
      .from(table)
      .select("id, metadata")
      .is("license_spdx", null)
      .order("id", { ascending: true })
      .limit(opts.batch);
    if (cursor) q = q.gt("id", cursor);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;

    cursor = data[data.length - 1].id;

    // Process this batch with bounded concurrency
    const queue = data.slice();
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const row = queue.shift();
        if (!row) break;
        processed++;
        const owner = row.metadata?.owner;
        const repo = row.metadata?.repo;
        if (!owner || !repo) continue;

        const spdx = await fetchRepoLicense(owner, repo);
        if (spdx === undefined) continue;

        if (spdx) {
          if (opts.apply) {
            const { error: uErr } = await sb
              .from(table)
              .update({ license_spdx: spdx })
              .eq("id", row.id);
            if (uErr) {
              console.warn(`  ✗ update ${row.id}: ${uErr.message}`);
              continue;
            }
          }
          updated++;
        } else {
          noLicense++;
        }
      }
    });
    await Promise.all(workers);

    process.stdout.write(
      `\r  processed ${processed} / ${total} · updated ${updated} · no-license ${noLicense}`
    );
  }
  console.log();
  return { processed, updated, no_license: noLicense };
}

async function main() {
  const opts = parseArgs();
  console.log(`[backfill] starting · ${JSON.stringify(opts)}`);
  console.log(`[backfill] using ${TOKENS.length} GitHub token(s)`);
  if (TOKENS.length === 0) {
    console.warn(`[backfill] ⚠ no GITHUB_TOKENS — rate limit 60 req/h (will be slow)`);
  }

  const sb = makeSupabase();

  if (opts.kind === "skill" || opts.kind === "both") {
    const r = await backfillTable(sb, "skills", opts);
    console.log(
      `[backfill] skills · processed ${r.processed} · updated ${r.updated} · no_license ${r.no_license}`
    );
  }

  if (opts.kind === "claude_md" || opts.kind === "both") {
    const r = await backfillTable(sb, "claude_md_files", opts);
    console.log(
      `[backfill] claude_md · processed ${r.processed} · updated ${r.updated} · no_license ${r.no_license}`
    );
  }

  console.log(
    `\n[backfill] DONE. ${opts.apply ? "Changes committed." : "DRY RUN — re-run with --apply."}`
  );
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(1);
});
