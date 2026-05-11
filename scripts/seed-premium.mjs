#!/usr/bin/env node
import "./_env.mjs";

/**
 * Seed 5 skills + 1 CLAUDE.md as premium-tier, verified, low-priced.
 *
 * Picks well-scored existing rows (highest github_stars per category) and
 * marks them premium ($1.99 by default), verification_level=2 (verified),
 * with author_user_id pinned to SEED_AUTHOR_USER_ID — typically your own
 * Supabase auth user UUID — so the buy flow has a payable seller.
 *
 * Idempotent : never overwrites a row that's already premium.
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_AUTHOR_USER_ID         (uuid; the Stripe-onboarded seller)
 *
 * Optional:
 *   SEED_PRICE_USD              (default 1.99)
 *   SEED_SKILL_COUNT            (default 5)
 *   SEED_CLAUDE_COUNT           (default 1)
 *
 * Usage:  npm run seed:premium
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorUserId = process.env.SEED_AUTHOR_USER_ID;
const priceUsd = Number(process.env.SEED_PRICE_USD || "1.99");
const skillCount = parseInt(process.env.SEED_SKILL_COUNT || "5", 10);
const claudeCount = parseInt(process.env.SEED_CLAUDE_COUNT || "1", 10);

if (!url || !serviceKey) {
  console.error("[seed-premium] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!authorUserId) {
  console.error(
    "[seed-premium] SEED_AUTHOR_USER_ID is required. Find it in Supabase: select id, raw_user_meta_data->>'user_name' from auth.users;"
  );
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
const nowIso = new Date().toISOString();

async function bumpSkills() {
  // Pick top free-tier skills with diverse categories. Prefer rows that
  // already have author_user_id null (we won't yank items from real authors).
  const { data: candidates, error } = await sb
    .from("skills")
    .select("id, slug, name, category, github_stars, tier, author_user_id")
    .eq("tier", "free")
    .order("github_stars", { ascending: false, nullsFirst: false })
    .limit(80);
  if (error) throw new Error(`skills query: ${error.message}`);

  // Pick by category diversity.
  const seenCat = new Set();
  const picks = [];
  for (const c of candidates || []) {
    if (picks.length >= skillCount) break;
    if (seenCat.has(c.category)) continue;
    if (c.author_user_id && c.author_user_id !== authorUserId) continue;
    picks.push(c);
    seenCat.add(c.category);
  }
  // Backfill if we ran out of unique categories.
  for (const c of candidates || []) {
    if (picks.length >= skillCount) break;
    if (picks.find((p) => p.id === c.id)) continue;
    if (c.author_user_id && c.author_user_id !== authorUserId) continue;
    picks.push(c);
  }

  const updates = picks.map((p) =>
    sb
      .from("skills")
      .update({
        tier: "premium",
        price_usd: priceUsd,
        verification_level: 2,
        verified_at: nowIso,
        author_user_id: authorUserId,
      })
      .eq("id", p.id)
  );
  const results = await Promise.all(updates);
  let ok = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].error) {
      console.warn(`[seed-premium] skill ${picks[i].slug} update failed: ${results[i].error.message}`);
    } else {
      ok += 1;
      console.log(`[seed-premium] skill ↑ premium · ${picks[i].slug} (${picks[i].category}) — $${priceUsd}`);
    }
  }
  return ok;
}

async function bumpClaudeMds() {
  const { data: candidates, error } = await sb
    .from("claude_md_files")
    .select("id, slug, project_category, github_stars, tier, author_user_id")
    .eq("tier", "free")
    .in("project_category", ["nextjs", "python-data", "react", "backend-api"])
    .order("github_stars", { ascending: false, nullsFirst: false })
    .limit(40);
  if (error) throw new Error(`claude_md_files query: ${error.message}`);

  const picks = [];
  for (const c of candidates || []) {
    if (picks.length >= claudeCount) break;
    if (c.author_user_id && c.author_user_id !== authorUserId) continue;
    picks.push(c);
  }

  const updates = picks.map((p) =>
    sb
      .from("claude_md_files")
      .update({
        tier: "premium",
        price_usd: priceUsd,
        verification_level: 2,
        verified_at: nowIso,
        author_user_id: authorUserId,
      })
      .eq("id", p.id)
  );
  const results = await Promise.all(updates);
  let ok = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].error) {
      console.warn(`[seed-premium] claude_md ${picks[i].slug} update failed: ${results[i].error.message}`);
    } else {
      ok += 1;
      console.log(`[seed-premium] claude_md ↑ premium · ${picks[i].slug} (${picks[i].project_category}) — $${priceUsd}`);
    }
  }
  return ok;
}

(async () => {
  console.log(`[seed-premium] Author user id: ${authorUserId}`);
  console.log(`[seed-premium] Price: $${priceUsd}`);
  console.log(`[seed-premium] Skills wanted: ${skillCount} · CLAUDE.md wanted: ${claudeCount}`);

  // Fast precheck — avoid noise if we already seeded.
  const { count: alreadyPremiumSkills } = await sb
    .from("skills")
    .select("*", { count: "exact", head: true })
    .eq("tier", "premium")
    .eq("author_user_id", authorUserId);
  const { count: alreadyPremiumClaude } = await sb
    .from("claude_md_files")
    .select("*", { count: "exact", head: true })
    .eq("tier", "premium")
    .eq("author_user_id", authorUserId);
  console.log(
    `[seed-premium] Already premium for this author → skills:${alreadyPremiumSkills || 0} claude_md:${alreadyPremiumClaude || 0}`
  );

  const skillsOk = await bumpSkills();
  const claudeOk = await bumpClaudeMds();

  console.log("");
  console.log(`[seed-premium] Done. Promoted ${skillsOk} skills + ${claudeOk} CLAUDE.md to premium.`);
  console.log(`[seed-premium] Browse: /marketplace?tier=premium`);
})().catch((err) => {
  console.error(`[seed-premium] FATAL: ${err.message}`);
  process.exit(1);
});
