#!/usr/bin/env node
import "./_env.mjs";

/**
 * Emergency pg_dump watcher.
 *
 * Poll la DB toutes les 10s. Dès qu'elle répond, lance pg_dump immédiatement
 * en background pour capturer le state avant qu'elle re-crash.
 *
 * Usage :
 *   node scripts/emergency-dump.mjs
 *
 * Necessite la connection string DB (pas l'URL PostgREST) dans .env.local :
 *   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
 *
 *   Tu trouves cette URL dans :
 *   Supabase Dashboard → Project Settings → Database → Connection string → URI (transaction mode)
 *
 * Crée un fichier emergency-backup-YYYYMMDD-HHmm.dump dans le cwd.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);
const POLL_INTERVAL_MS = 10_000;

async function probeDb(connStr) {
  try {
    const { stdout } = await execAsync(
      `psql "${connStr}" -c "SELECT count(*) FROM skills;" -t -A --no-psqlrc`,
      { timeout: 8000 }
    );
    const count = parseInt(stdout.trim(), 10);
    return { ok: true, skillCount: count };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function runDump(connStr) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const outFile = `emergency-backup-${ts}.dump`;
  console.log(`\n🟢 DB is up! Starting pg_dump to ${outFile}...`);
  console.log(`   (this can take 30s-3min depending on data size)`);

  try {
    const { stderr } = await execAsync(
      `pg_dump "${connStr}" --no-owner --no-acl --format=custom --file="${outFile}" --verbose 2>&1`,
      { timeout: 10 * 60_000, maxBuffer: 50 * 1024 * 1024 }
    );
    // pg_dump --verbose writes to stderr by design, that's not an error
    console.log(`\n✅ DUMP SUCCESS → ${outFile}`);
    console.log(`   To restore later on a new project :`);
    console.log(`   pg_restore --no-owner --no-acl -d "<new-connection-string>" "${outFile}"`);
    return true;
  } catch (err) {
    console.error(`\n❌ pg_dump failed (DB probably crashed during dump):`);
    console.error(`   ${err.message.slice(0, 500)}`);
    // Keep the partial file — better than nothing
    if (existsSync(outFile)) {
      console.log(`   Partial file kept at ${outFile} (probably unusable)`);
    }
    return false;
  }
}

async function main() {
  const connStr = process.env.SUPABASE_DB_URL;
  if (!connStr) {
    console.error("❌ SUPABASE_DB_URL not set in .env.local.");
    console.error(`   Find it in Supabase Dashboard → Project Settings → Database
      → Connection string → URI (transaction mode).
      Format : postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`);
    process.exit(1);
  }

  console.log("🔄 Watching DB. Will dump on first healthy response.");
  console.log(`   Poll interval : ${POLL_INTERVAL_MS / 1000}s. Ctrl+C to stop.\n`);

  let attempt = 0;
  while (true) {
    attempt += 1;
    const result = await probeDb(connStr);
    const ts = new Date().toLocaleTimeString();
    if (result.ok) {
      console.log(`[${ts}] attempt ${attempt} · 🟢 DB UP · ${result.skillCount} skills visible`);
      const success = await runDump(connStr);
      if (success) {
        console.log("\n🎉 Backup complete. Stopping watcher.");
        process.exit(0);
      }
      console.log("\n⚠ Dump failed mid-way. Continuing to watch for next window...\n");
    } else {
      const reason = result.error.includes("57P03")
        ? "still recovering"
        : result.error.includes("ENOTFOUND")
          ? "DNS error"
          : result.error.includes("ECONNREFUSED")
            ? "connection refused"
            : result.error.slice(0, 60);
      console.log(`[${ts}] attempt ${attempt} · 🔴 DB down · ${reason}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error(`fatal: ${err.message}`);
  process.exit(1);
});
