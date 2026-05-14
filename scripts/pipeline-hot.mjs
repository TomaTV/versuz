#!/usr/bin/env node
import "./_env.mjs";

/**
 * Versuz HOT pipeline — scrape → quality → bench par vagues (wave processing)
 *
 * Au lieu de scraper TOUT puis quality TOUT puis bench TOUT,
 * ce pipeline traite les skills par lots de 50 :
 *   - Scrape 50 nouveaux skills
 *   - Quality judge ces 50 immédiatement  
 *   - Bench ces 50 immédiatement
 *   - Passe aux 50 suivants
 *
 * Avantages :
 *   - Skills apparaissent sur le leaderboard en ~30min au lieu de 8h
 *   - Si crash, seule la vague en cours est perdue
 *   - Quality et bench peuvent commencer pendant que le scrape continue
 *
 * Usage :
 *   npm run pipeline:hot              # vague de 50, min-stars=50
 *   npm run pipeline:hot -- --wave-size=100 --min-stars=0
 *   npm run pipeline:hot -- --vagues=5   # stop après 5 vagues
 *
 * Estimation : ~10-15 min par vague (scrape 50 + quality 50 + bench 50×5 tasks×3 judges)
 */

import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {
    waveSize: 5,
    minStars: 50,
    maxVagues: Infinity,
    dryRun: false,
    kinds: ["skill", "claude_md"],
  };
  for (const tok of argv) {
    if (tok.startsWith("--wave-size=")) out.waveSize = parseInt(tok.split("=")[1], 10) || 50;
    else if (tok.startsWith("--min-stars=")) out.minStars = tok.split("=")[1];
    else if (tok.startsWith("--vagues=")) out.maxVagues = parseInt(tok.split("=")[1], 10) || Infinity;
    else if (tok.startsWith("--kind=")) out.kinds = [tok.split("=")[1]];
    else if (tok === "--dry-run") out.dryRun = true;
  }
  return out;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function runScript(name, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`  → ${name} ${args.join(" ")}`);
    const child = spawn("node", [join(__dirname, name), ...args], { stdio: "inherit" });
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`${name} exited ${code}`));
      else resolve();
    });
    child.on("error", reject);
  });
}

async function getNewItemsSince(sb, table, since, kind) {
  const { data, error } = await sb
    .from(table)
    .select("slug, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sb = makeSupabase();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Versuz HOT Pipeline — par vagues (5 items)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  vague size: ${args.waveSize} items (default 5)`);
  console.log(`  max vagues: ${args.maxVagues === Infinity ? "∞" : args.maxVagues}`);
  console.log(`  kinds: ${args.kinds.join(", ")}`);
  console.log(`  min-stars: ${args.minStars}`);
  console.log("");

  let vagueNum = 0;
  let totalNew = 0;

  while (vagueNum < args.maxVagues) {
    vagueNum++;
    const vagueStart = Date.now();
    const since = new Date();

    console.log(`\n━━━━━━━━━━ VAGUE ${vagueNum} ━━━━━━━━━━`);

    // 1. SCRAPE (une passe rapide pour cette vague)
    console.log("[1/3] Scraping…");
    try {
      // On scrape sans mode exhaustif pour aller vite, juste le baseline
      await runScript("scrape-codesearch/index.mjs", [
        "--min-stars=" + args.minStars,
        "--max-pages=2", // limite pour aller vite
      ]);
    } catch (e) {
      console.warn("  Scrape warning:", e.message);
    }

    // 2. Attendre un peu que DB persiste
    await new Promise((r) => setTimeout(r, 2000));

    // 3. Récupérer les nouveaux items de cette vague
    const newSkills = await getNewItemsSince(sb, "skills", since, "skill");
    const newClaude = await getNewItemsSince(sb, "claude_md_files", since, "claude_md");
    const vagueItems = [...newSkills, ...newClaude];

    if (vagueItems.length === 0) {
      console.log("  Aucun nouvel item trouvé dans cette vague — arrêt.");
      break;
    }

    totalNew += vagueItems.length;
    console.log(`  ${vagueItems.length} nouveaux items (${newSkills.length} skills, ${newClaude.length} claude_md)`);

    // 4. QUALITY JUDGE (limité à la vague)
    console.log("[2/3] Quality judge…");
    for (const kind of args.kinds) {
      try {
        // Quality judge auto-skip les déjà jugés, donc on lance sur tout
        await runScript("bench/quality-judge.mjs", ["--kind=" + kind, "--limit=" + args.waveSize]);
      } catch (e) {
        console.warn("  Quality warning:", e.message);
      }
    }

    // 5. BENCH (un cycle pour ces items spécifiques)
    if (!args.dryRun) {
      console.log("[3/3] Bench cycle…");
      try {
        // Enqueue un cycle
        await runScript("bench/enqueue-cycle.mjs", []);
        // Run le bench (va prendre les items enqueued)
        await runScript("bench/full.mjs", []);
      } catch (e) {
        console.warn("  Bench warning:", e.message);
      }
    }

    const vagueMin = ((Date.now() - vagueStart) / 60000).toFixed(1);
    console.log(`  ✓ Vague ${vagueNum} terminée en ${vagueMin}min`);

    // Pause entre vagues pour ne pas surcharger
    if (vagueNum < args.maxVagues) {
      console.log("  Pause 10s avant prochaine vague…");
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
 console.log(`  ✅ Pipeline HOT terminé — ${vagueNum} vagues, ${totalNew} items traités`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err) => {
  console.error("[pipeline:hot] fatal:", err.message);
  process.exit(1);
});
