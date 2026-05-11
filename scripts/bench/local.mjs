#!/usr/bin/env node
import "../_env.mjs";
/**
 * Local bench — run the full pipeline (skill × task × judges) entirely in
 * memory + JSON files, without Supabase. Useful for testing the engine
 * before bringing up the DB.
 *
 *   npm run bench:local -- --subjects=tmp/skills.json --tasks=tasks/document.json
 *
 * Inputs:
 *   --subjects=PATH    JSON array of skills or claude_md_files (from scrape:* output)
 *   --tasks=PATH       JSON array of task definitions
 *   --output=PATH      where to write the results (default: tmp/bench-results.json)
 *   --kind=skill|claude_md   which subject kind we're judging (default: skill)
 *   --limit=N          cap the number of (subject × task) jobs (default: all)
 *
 * What it does:
 *   1. Loads subjects + tasks
 *   2. For each (subject, task) pair:
 *      a. Calls a stubbed agent (we just embed the subject content as the
 *         "output" — replace with real Claude Code execution later)
 *      b. Asks each active judge to score the output
 *      c. Aggregates with weighted average
 *   3. Writes a results JSON with per-task scores + per-subject aggregate
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { JUDGES, JUDGE_MODE, judgesLabel } from "../../src/lib/judges.js";
import { judgeOutput } from "./judge-call.mjs";

const CACHE_PATH = "tmp/judge-cache.json";

function cacheKey(judgeId, taskSlug, output) {
  const h = createHash("sha256").update(`${taskSlug}::${output}`).digest("hex").slice(0, 16);
  return `${judgeId}::${h}`;
}

async function loadCache() {
  if (!existsSync(CACHE_PATH)) return new Map();
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf-8");
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

async function saveCache(cache) {
  const obj = Object.fromEntries(cache);
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(obj));
}

/**
 * Group judges by provider so we can parallelise across providers (different
 * rate-limit pools) but stay sequential within a provider (avoid 429).
 */
function groupByProvider(judges) {
  const map = new Map();
  for (const j of judges) {
    if (!map.has(j.provider)) map.set(j.provider, []);
    map.get(j.provider).push(j);
  }
  return map;
}

async function judgeAllParallelByProvider({ task, output, cache }) {
  const groups = groupByProvider(JUDGES);
  const groupResults = await Promise.all(
    [...groups.values()].map(async (judgesInGroup) => {
      const out = [];
      for (const judge of judgesInGroup) {
        const k = cacheKey(judge.id, task.slug, output);
        if (cache.has(k)) {
          const c = cache.get(k);
          out.push({
            judgeId: judge.id,
            judgeLabel: judge.shortLabel,
            score: c.score,
            rationale: c.rationale,
            cached: true,
          });
          continue;
        }
        try {
          const r = await judgeOutput({ judge, task, output });
          cache.set(k, { score: r.score, rationale: r.rationale });
          out.push({
            judgeId: judge.id,
            judgeLabel: judge.shortLabel,
            score: r.score,
            rationale: r.rationale,
            cached: false,
          });
        } catch (err) {
          out.push({
            judgeId: judge.id,
            judgeLabel: judge.shortLabel,
            score: null,
            error: err.message,
          });
        }
      }
      return out;
    })
  );
  return groupResults.flat();
}

function parseArgs(argv) {
  // Sensible defaults so `node scripts/bench/local.mjs` (or `npm run bench:local`
  // without flags) works out of the box.
  const out = {
    subjects: process.env.SUBJECTS || "tmp/skills.json",
    tasks: process.env.TASKS || "tasks/document.json",
    output: process.env.OUTPUT || "tmp/bench-results.json",
    kind: process.env.KIND || "skill",
    limit: Number(process.env.LIMIT) || 0,
  };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--subjects=")) out.subjects = arg.slice(11);
    else if (arg.startsWith("--tasks=")) out.tasks = arg.slice(8);
    else if (arg.startsWith("--output=")) out.output = arg.slice(9);
    else if (arg.startsWith("--kind=")) out.kind = arg.slice(7);
    else if (arg.startsWith("--limit=")) out.limit = Number(arg.slice(8)) || 0;
  }
  return out;
}

function aggregateWeighted(scores, judges) {
  const byJudge = Object.fromEntries(scores.map((s) => [s.judgeId, s.score]));
  let weighted = 0;
  let totalWeight = 0;
  for (const j of judges) {
    if (byJudge[j.id] != null) {
      weighted += byJudge[j.id] * j.weight;
      totalWeight += j.weight;
    }
  }
  return totalWeight === 0 ? 0 : weighted / totalWeight;
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[bench:local] mode=${JUDGE_MODE} judges=${judgesLabel({ short: true })}`);
  console.log(`[bench:local] subjects=${args.subjects} tasks=${args.tasks}`);

  let subjects, tasks;
  try {
    subjects = JSON.parse(await fs.readFile(path.resolve(args.subjects), "utf-8"));
  } catch (err) {
    console.error(
      `[bench:local] cannot read --subjects=${args.subjects} (${err.code || err.message}).\n` +
        `  You can:\n` +
        `    1. Run the scraper first:\n` +
        `         node scripts/scrape-claude-md/index.mjs --max-pages=1 --output=tmp/skills.json --dry-run\n` +
        `    2. Or hand-craft a JSON file with [{slug, name, skill_md_content (or content)}].\n` +
        `    3. Or override the path:\n` +
        `         SUBJECTS=path/to/file.json npm run bench:local\n` +
        `         (PowerShell:  $env:SUBJECTS="path/to/file.json"; npm run bench:local)`
    );
    process.exit(1);
  }
  try {
    tasks = JSON.parse(await fs.readFile(path.resolve(args.tasks), "utf-8"));
  } catch (err) {
    console.error(
      `[bench:local] cannot read --tasks=${args.tasks} (${err.code || err.message}). Default suite is at tasks/document.json — make sure it exists or pass TASKS=...`
    );
    process.exit(1);
  }
  console.log(`[bench:local] loaded ${subjects.length} subjects × ${tasks.length} tasks`);

  const cache = await loadCache();
  if (cache.size) {
    console.log(`[bench:local] loaded ${cache.size} cached judge scores from ${CACHE_PATH}`);
  }

  const results = [];
  let processed = 0;
  let errors = 0;
  const startedAt = Date.now();

  outer: for (const subject of subjects) {
    const subjectKey = subject.slug || subject.id || subject.name;
    const subjectContent =
      subject.skill_md_content || subject.content || JSON.stringify(subject).slice(0, 4000);

    for (const task of tasks) {
      if (args.limit && processed >= args.limit) break outer;

      // Stub: the "agent output" is just an extract of the subject content.
      // Replace by an actual Claude Code execution once the harness is wired.
      const output = `[stubbed agent run]\nSubject: ${subjectKey}\nTask: ${task.slug}\n\nFirst 800 chars of subject content:\n${subjectContent.slice(0, 800)}`;

      const taskScores = await judgeAllParallelByProvider({ task, output, cache });
      for (const s of taskScores) {
        if (s.score == null) {
          errors += 1;
          console.warn(
            `[bench:local]   ${s.judgeId} failed on ${subjectKey}/${task.slug}: ${(s.error || "").slice(0, 120)}`
          );
        }
      }

      const aggregate = aggregateWeighted(
        taskScores.filter((s) => s.score != null),
        JUDGES
      );

      results.push({
        subject_kind: args.kind,
        subject: subjectKey,
        task: task.slug,
        scores: taskScores,
        aggregate: Number(aggregate.toFixed(2)),
      });

      processed += 1;
      if (processed % 5 === 0) {
        console.log(`[bench:local]   ${processed} jobs done · ${errors} errors`);
      }
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[bench:local] done · ${processed} jobs · ${errors} errors · ${elapsed}s`);

  // Aggregate per subject
  const bySubject = {};
  for (const r of results) {
    (bySubject[r.subject] ||= []).push(r.aggregate);
  }
  const ranking = Object.entries(bySubject)
    .map(([subject, scores]) => ({
      subject,
      avg: Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
      tasks: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  const payload = {
    mode: JUDGE_MODE,
    judges: JUDGES.map((j) => ({ id: j.id, provider: j.provider, modelId: j.modelId })),
    subject_kind: args.kind,
    started_at: new Date(startedAt).toISOString(),
    elapsed_s: Number(elapsed),
    processed,
    errors,
    ranking,
    runs: results,
  };

  await ensureDir(args.output);
  await fs.writeFile(path.resolve(args.output), JSON.stringify(payload, null, 2));
  await saveCache(cache);
  console.log(`[bench:local] wrote ${args.output} · cache=${cache.size} entries`);
  console.log(
    `[bench:local] top 3:\n${ranking
      .slice(0, 3)
      .map((r, i) => `  ${i + 1}. ${r.subject} · ${r.avg}/100 (${r.tasks} tasks)`)
      .join("\n")}`
  );
}

main().catch((err) => {
  console.error(`[bench:local] fatal: ${err.stack || err.message}`);
  process.exit(1);
});
