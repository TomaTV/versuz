#!/usr/bin/env node
import "../_env.mjs";

/**
 * Post-cycle hooks — gamification side effects.
 *
 * Runs after a bench cycle reaches `status='completed'`. Snapshots the
 * ranking per category, detects achievements (Triple Crown, first_blood,
 * category_winner, streak milestones), and updates the streak counters
 * on skills / claude_md_files.
 *
 * Idempotent : all achievement inserts use ON CONFLICT DO NOTHING against
 * partial unique indexes from migration 0052. Safe to re-run on the same
 * cycle.
 *
 * Usage :
 *   node scripts/bench/post-cycle-hooks.mjs                # latest completed cycle
 *   node scripts/bench/post-cycle-hooks.mjs --cycle=22     # specific cycle
 *   node scripts/bench/post-cycle-hooks.mjs --dry-run      # log without writes
 */

import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const cycleArg = process.argv.find((a) => a.startsWith("--cycle="))?.split("=")[1];
const DRY = args.has("--dry-run");
const SNAPSHOT_TOP_N = 100;
const TRIPLE_CROWN_MIN_SCORE = 85;
const STREAK_MILESTONES = [7, 30, 100];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

function log(...args) {
  console.log("[post-cycle]", ...args);
}

async function pickCycle() {
  if (cycleArg) {
    const { data } = await sb
      .from("cycles")
      .select("id, status, scope, completed_at")
      .eq("id", Number(cycleArg))
      .maybeSingle();
    if (!data) throw new Error(`Cycle #${cycleArg} not found`);
    return data;
  }
  const { data } = await sb
    .from("cycles")
    .select("id, status, scope, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("No completed cycle found");
  return data;
}

/**
 * For a given cycle, return the list of distinct categories that have
 * ranked output (avg_score not null). We use the materialized view
 * `rankings` since it's the source of truth for /leaderboard.
 */
async function getCategoriesForCycle(cycleId) {
  const { data } = await sb
    .from("rankings")
    .select("category, subject_kind")
    .eq("cycle_id", cycleId)
    .not("avg_score", "is", null);
  const set = new Map();
  for (const r of data || []) {
    const key = `${r.subject_kind}:${r.category}`;
    set.set(key, { kind: r.subject_kind, category: r.category });
  }
  return Array.from(set.values());
}

/**
 * Pull the top N ranked items for a (kind, category) from this cycle.
 */
async function getTopForCategory(cycleId, kind, category, limit = SNAPSHOT_TOP_N) {
  const idCol = kind === "skill" ? "skill_id" : "claude_md_id";
  const { data } = await sb
    .from("rankings")
    .select(`${idCol}, avg_score, axes`)
    .eq("cycle_id", cycleId)
    .eq("subject_kind", kind)
    .eq("category", category)
    .not("avg_score", "is", null)
    .order("avg_score", { ascending: false })
    .limit(limit);
  return (data || []).map((r, i) => ({
    rank: i + 1,
    subjectId: r[idCol],
    score: Number(r.avg_score),
    axes: r.axes || null,
  }));
}

/**
 * Previous cycle's #1 in this (kind, category), used for streak logic.
 * Returns the subject id of the prior leader, or null.
 */
async function getPreviousLeader(currentCycleId, kind, category) {
  const idCol = kind === "skill" ? "skill_id" : "claude_md_id";
  const { data } = await sb
    .from("rank_history")
    .select(`${idCol}, cycle_id, snapshot_at`)
    .eq("subject_kind", kind)
    .eq("category", category)
    .eq("rank", 1)
    .lt("cycle_id", currentCycleId)
    .order("cycle_id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data
    ? { subjectId: data[idCol], cycleId: data.cycle_id, snapshotAt: data.snapshot_at }
    : null;
}

async function snapshotRankHistory(cycleId, kind, category, top) {
  if (top.length === 0) return 0;
  const rows = top.map((t) => ({
    cycle_id: cycleId,
    subject_kind: kind,
    skill_id: kind === "skill" ? t.subjectId : null,
    claude_md_id: kind === "claude_md" ? t.subjectId : null,
    category,
    rank: t.rank,
    elo: t.score,
  }));
  if (DRY) return rows.length;
  // upsert via onConflict on rank_history_unique_per_cycle
  // We use plain insert with ignoreDuplicates so reruns are idempotent.
  const { error, count } = await sb
    .from("rank_history")
    .upsert(rows, {
      onConflict: "skill_id,claude_md_id,category,cycle_id",
      ignoreDuplicates: true,
      count: "exact",
    });
  if (error) {
    console.error("[rank_history]", error.message);
    return 0;
  }
  return count ?? rows.length;
}

async function insertAchievement({ subjectKind, subjectId, type, category, cycleId, metadata = {} }) {
  if (DRY) return true;
  const payload = {
    subject_kind: subjectKind,
    skill_id: subjectKind === "skill" ? subjectId : null,
    claude_md_id: subjectKind === "claude_md" ? subjectId : null,
    type,
    category: category ?? null,
    cycle_id: cycleId ?? null,
    metadata,
  };
  const { error } = await sb.from("item_achievements").insert(payload);
  // Partial unique indexes return 23505 on duplicate — that's expected on rerun.
  if (error && error.code !== "23505") {
    console.error(`[achievement:${type}]`, error.message);
    return false;
  }
  return !error;
}

async function updateStreak(kind, subjectId, category, action) {
  if (DRY) return;
  const table = kind === "skill" ? "skills" : "claude_md_files";
  if (action.type === "reset") {
    await sb
      .from(table)
      .update({
        top_rank_streak_days: 0,
        top_rank_streak_category: null,
        top_rank_streak_started_at: null,
      })
      .eq("id", subjectId);
    return;
  }
  if (action.type === "increment") {
    // Read current state to compute new day count
    const { data: row } = await sb
      .from(table)
      .select("top_rank_streak_days, top_rank_streak_category, top_rank_streak_started_at")
      .eq("id", subjectId)
      .maybeSingle();
    const sameCategory = row?.top_rank_streak_category === category;
    const newDays = sameCategory ? (row.top_rank_streak_days || 0) + 1 : 1;
    await sb
      .from(table)
      .update({
        top_rank_streak_days: newDays,
        top_rank_streak_category: category,
        top_rank_streak_started_at: sameCategory && row.top_rank_streak_started_at
          ? row.top_rank_streak_started_at
          : new Date().toISOString(),
      })
      .eq("id", subjectId);
    return newDays;
  }
}

async function processCycle(cycle) {
  const cycleId = cycle.id;
  log(`processing cycle #${cycleId} (status=${cycle.status})`);

  const cats = await getCategoriesForCycle(cycleId);
  if (cats.length === 0) {
    log(`no ranked categories in cycle #${cycleId} — nothing to do`);
    return;
  }
  log(`${cats.length} (kind, category) pairs to process`);

  let counts = {
    snapshots: 0,
    firstBlood: 0,
    catWinner: 0,
    tripleCrown: 0,
    streakStarts: 0,
    streakIncrements: 0,
    streakResets: 0,
    streakMilestones: 0,
  };

  for (const { kind, category } of cats) {
    const top = await getTopForCategory(cycleId, kind, category);
    if (top.length === 0) continue;

    // 1. Snapshot rank history (top 100)
    counts.snapshots += await snapshotRankHistory(cycleId, kind, category, top);

    // 2. first_blood — every subject newly entering rank_history gets it.
    //    For perf, we just attempt the insert; the unique partial index
    //    silently rejects dupes.
    for (const t of top) {
      const ok = await insertAchievement({
        subjectKind: kind,
        subjectId: t.subjectId,
        type: "first_blood",
        category: null,
        cycleId,
        metadata: { rank: t.rank, score: t.score, category },
      });
      if (ok) counts.firstBlood += 0; // can't tell from supabase-js if it deduped; leave as 0 increment unless verified
    }

    // 3. category_winner — #1 of this category for the first time
    const winner = top[0];
    await insertAchievement({
      subjectKind: kind,
      subjectId: winner.subjectId,
      type: "category_winner",
      category,
      cycleId,
      metadata: { score: winner.score },
    });

    // 4. Triple Crown — #1 with avg_score >= 85 (proxy for judge consensus)
    if (winner.score >= TRIPLE_CROWN_MIN_SCORE) {
      const ok = await insertAchievement({
        subjectKind: kind,
        subjectId: winner.subjectId,
        type: "triple_crown",
        category,
        cycleId,
        metadata: { score: winner.score },
      });
      if (ok) counts.tripleCrown += 1;
    }

    // 5. Streaks — only act on the #1 vs previous cycle's #1
    const prevLeader = await getPreviousLeader(cycleId, kind, category);
    if (!prevLeader) {
      // First leader in this category ever
      const days = await updateStreak(kind, winner.subjectId, category, { type: "increment" });
      counts.streakStarts += 1;
      if (days && STREAK_MILESTONES.includes(days)) {
        await insertAchievement({
          subjectKind: kind,
          subjectId: winner.subjectId,
          type: "streak_milestone",
          category,
          cycleId,
          metadata: { days, category },
        });
        counts.streakMilestones += 1;
      }
    } else if (prevLeader.subjectId === winner.subjectId) {
      // Same leader as previous cycle → increment streak
      const days = await updateStreak(kind, winner.subjectId, category, { type: "increment" });
      counts.streakIncrements += 1;
      if (days && STREAK_MILESTONES.includes(days)) {
        await insertAchievement({
          subjectKind: kind,
          subjectId: winner.subjectId,
          type: "streak_milestone",
          category,
          cycleId,
          metadata: { days, category },
        });
        counts.streakMilestones += 1;
      }
    } else {
      // Leader changed — reset previous leader's streak, start new
      await updateStreak(kind, prevLeader.subjectId, category, { type: "reset" });
      counts.streakResets += 1;
      await updateStreak(kind, winner.subjectId, category, { type: "increment" });
      counts.streakStarts += 1;
    }
  }

  log("done", counts, DRY ? "(DRY-RUN)" : "");
}

(async () => {
  try {
    const cycle = await pickCycle();
    await processCycle(cycle);
  } catch (err) {
    console.error("[post-cycle] failed:", err.message);
    process.exit(1);
  }
})();
