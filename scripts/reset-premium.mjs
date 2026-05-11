#!/usr/bin/env node
import "./_env.mjs";

/**
 * Reset items that you (or seed-premium) marked as premium back to free.
 *
 * Why your manual SQL didn't work :
 *   migrations/0003_marketplace.sql declares a CHECK constraint
 *   `skills_price_consistent` that requires:
 *     (tier = 'free' AND price_usd IS NULL)
 *   OR
 *     (tier IN ('premium','featured') AND price_usd >= 0)
 *
 *   So you can't set tier='free' without ALSO nulling price_usd in the
 *   same UPDATE — Postgres refuses the row mid-update because the new
 *   tier-vs-price combo violates the constraint. Same for clearing
 *   verification_level / verified_at / author_user_id at the same time.
 *
 * Modes :
 *   --dry-run                    show what would change, don't write
 *   --author=<uuid>              only reset items where author_user_id = uuid
 *                                 (default: SEED_AUTHOR_USER_ID env var)
 *   --keep-author                keep author_user_id, only reset tier+price
 *   --keep-verification          keep verification_level + verified_at
 *
 * Usage :
 *   node scripts/reset-premium.mjs                    # full reset for SEED_AUTHOR_USER_ID
 *   node scripts/reset-premium.mjs --dry-run          # preview only
 *   node scripts/reset-premium.mjs --keep-author      # demote tier but keep ownership
 */

import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const KEEP_AUTHOR = args.has("--keep-author");
const KEEP_VERIFICATION = args.has("--keep-verification");
const authorArg = process.argv.find((a) => a.startsWith("--author="));
const targetAuthor =
  (authorArg ? authorArg.split("=")[1] : null) || process.env.SEED_AUTHOR_USER_ID;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("[reset-premium] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!targetAuthor) {
  console.error(
    "[reset-premium] Need an author UUID. Pass --author=<uuid> or set SEED_AUTHOR_USER_ID."
  );
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

function patch() {
  const p = {
    tier: "free",
    price_usd: null,
  };
  if (!KEEP_AUTHOR) p.author_user_id = null;
  if (!KEEP_VERIFICATION) {
    p.verification_level = 0;
    p.verified_at = null;
  }
  return p;
}

async function preview(table) {
  const { data, error } = await sb
    .from(table)
    .select("id, slug, tier, price_usd, verification_level, author_user_id")
    .eq("author_user_id", targetAuthor)
    .in("tier", ["premium", "featured"]);
  if (error) throw new Error(`${table} preview: ${error.message}`);
  return data || [];
}

async function reset(table) {
  const before = await preview(table);
  if (before.length === 0) {
    console.log(`[reset-premium] ${table}: nothing to reset for author ${targetAuthor.slice(0, 8)}…`);
    return 0;
  }
  console.log(`[reset-premium] ${table}: ${before.length} row(s) targeted →`);
  for (const r of before) {
    console.log(`  · ${r.slug}  tier=${r.tier}  $${r.price_usd}  v${r.verification_level}`);
  }
  if (DRY_RUN) {
    console.log(`[reset-premium] DRY-RUN — no writes`);
    return 0;
  }
  const { error } = await sb
    .from(table)
    .update(patch())
    .eq("author_user_id", targetAuthor)
    .in("tier", ["premium", "featured"]);
  if (error) throw new Error(`${table} update: ${error.message}`);
  console.log(`[reset-premium] ${table}: ${before.length} row(s) reset OK`);
  return before.length;
}

async function purgePurchases() {
  // Optional: if you also want to delete the test purchase rows so the
  // marketplace doesn't show "Owned" badges from prior tests. Always asks
  // before purging.
  const { count } = await sb
    .from("purchases")
    .select("*", { count: "exact", head: true });
  if ((count || 0) === 0) return;
  console.log(`[reset-premium] Note: ${count} purchase row(s) still in DB.`);
  console.log(`  To purge them too: delete from purchases; (run in Supabase SQL editor)`);
}

(async () => {
  console.log(`[reset-premium] Author: ${targetAuthor}`);
  console.log(`[reset-premium] Mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"}${KEEP_AUTHOR ? " · keep-author" : ""}${KEEP_VERIFICATION ? " · keep-verification" : ""}`);
  console.log(`[reset-premium] Patch: ${JSON.stringify(patch())}`);
  console.log("");
  const skills = await reset("skills");
  const claude = await reset("claude_md_files");
  console.log("");
  console.log(`[reset-premium] Done. ${skills + claude} total row(s) reset.`);
  if (!DRY_RUN) await purgePurchases();
})().catch((err) => {
  console.error(`[reset-premium] FATAL: ${err.message}`);
  process.exit(1);
});
