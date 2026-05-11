#!/usr/bin/env node
import "./_env.mjs";
/**
 * Seed Supabase from local fixtures.
 * No-op (with a friendly note) if Supabase env vars aren't configured.
 *
 * Usage:  npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import { SKILLS } from "../src/lib/fixtures/seed.js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.log("[seed] Supabase env vars missing. Skipping. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to seed.");
  process.exit(0);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const skillRows = SKILLS.map((s) => ({
  slug: s.slug,
  name: s.name,
  github_url: `https://${s.github}`,
  github_stars: 0,
  description: s.description,
  category: "pdf-extraction",
  skill_md_content: "",
  metadata: { author: s.author, displayCategory: s.category },
}));

console.log(`[seed] Upserting ${skillRows.length} skills…`);
const { error } = await sb.from("skills").upsert(skillRows, { onConflict: "slug" });
if (error) {
  console.error("[seed] upsert failed:", error);
  process.exit(1);
}

console.log("[seed] Refreshing rankings materialized view…");
try {
  const { error } = await sb.rpc("refresh_rankings");
  if (error) console.log(`[seed] (skipping refresh — ${error.message})`);
} catch (e) {
  console.log(`[seed] (skipping refresh — ${e.message || "RPC not defined yet"})`);
}

console.log("[seed] Done.");
