/**
 * Bayesian Elo aggregation.
 *
 * Convert per-task scores into pairwise outcomes and update each subject's
 * Elo. Cold-start prior 1400. K-factor tapers from 32 → 8 with battle count.
 *
 * Run after a cycle's judge_scores are complete.
 */

const COLD_START = 1400;

export function eloDelta({ ratingA, ratingB, outcome, k = 32 }) {
  // outcome: 1 if A won, 0 if B won, 0.5 draw
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return k * (outcome - expectedA);
}

export function kFactor(battleCount) {
  // Linear taper from 32 (new) to 8 (100+ battles)
  if (battleCount >= 100) return 8;
  return Math.max(8, 32 - 0.24 * battleCount);
}

/**
 * Compute deltas for all subjects from this cycle's run_jobs.
 *
 * Pseudocode (DB ops left to caller):
 *
 *   for each task in this cycle:
 *     fetch all (subject, weighted_score) for this task
 *     for each pair (A, B):
 *       outcome = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5
 *       deltaA = eloDelta(ratingA, ratingB, outcome, kA)
 *       deltaB = -deltaA
 *       accumulate per-subject delta
 *
 *   commit deltas in a single transaction.
 *
 * The caller wires this up to Postgres because the DB layout (separate
 * skill / claude_md tables) makes the SQL specific to the bench scope.
 */
export function computePairwiseOutcomes(taskScoresBySubject) {
  const ids = Object.keys(taskScoresBySubject);
  const outcomes = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const sA = taskScoresBySubject[a];
      const sB = taskScoresBySubject[b];
      let outcome = 0.5;
      if (sA > sB) outcome = 1;
      else if (sA < sB) outcome = 0;
      outcomes.push({ a, b, outcome, scoreA: sA, scoreB: sB });
    }
  }
  return outcomes;
}
