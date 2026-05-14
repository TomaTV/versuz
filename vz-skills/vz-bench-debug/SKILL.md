---
name: vz-bench-debug
description: Diagnose a stuck or partial Versuz bench cycle. Walks the queue → agent → judges → rankings pipeline, identifies which stage is blocked, surfaces error messages, suggests retry vs reset vs continue commands. Use when /admin/cycles shows a cycle stuck at "running" for hours, or after a budget halt left a cycle in "partial" status.
tools: ["bash", "read"]
model: claude-opus-4-7
license: Versuz Featured
---

# vz-bench-debug

The bench engine has 4 moving parts (queue, agent runner, 3 judges, ranking refresh). When something hangs, you need to know WHICH part. This skill walks the chain in order, dumps the relevant SQL state, and proposes the right fix.

## When to use

- `/admin/cycles` shows a `running` cycle that hasn't progressed in > 1h
- A cycle is marked `partial` after budget halt — you want to continue
- Judge calls are failing with rate-limit errors on every retry
- Quality scores are stuck at NULL on freshly-scraped items

## When NOT to use

- For provider-side outage (OpenRouter down) → check status.openrouter.ai instead
- For benchmark methodology questions → read `docs/methodology.md`

## Diagnostic flow

The skill runs these checks in order, stops at the first failure :

### 1. Is there even a cycle to debug?
```sql
SELECT id, scope, status, started_at, completed_at,
       (SELECT count(*) FROM run_jobs WHERE cycle_id = c.id) as total,
       (SELECT count(*) FROM run_jobs WHERE cycle_id = c.id AND status='queued') as queued,
       (SELECT count(*) FROM run_jobs WHERE cycle_id = c.id AND status='running') as running,
       (SELECT count(*) FROM run_jobs WHERE cycle_id = c.id AND status='completed') as completed,
       (SELECT count(*) FROM run_jobs WHERE cycle_id = c.id AND status='error') as errored
FROM cycles c
ORDER BY started_at DESC
LIMIT 5;
```

### 2. Are run_jobs piling up at one status?

- All `queued` for > 1h → bench process isn't running. Restart `npm run bench`.
- All `running` for > 1h on a single job → agent call hanging. Kill + retry that job.
- High `error` count → look at error_message column for pattern.

### 3. Are judge calls failing?
```sql
SELECT judge_model, count(*) as calls,
       avg(score) as avg_score,
       count(*) FILTER (WHERE error_message IS NOT NULL) as errors
FROM judge_scores
WHERE created_at > now() - interval '1 hour'
GROUP BY judge_model;
```

If `errors > 0.3 * calls` for one model → circuit-breaker that model out of the run :
```
BENCH_JUDGE_COUNT=2 npm run bench
```

### 4. Rate-limit detective work

If error messages contain `429` or `quota exceeded` :
- Anthropic : check `console.anthropic.com` → Usage. Daily TPD or RPD hit?
- OpenRouter : check `openrouter.ai/credits` → balance > 0?
- Groq : free tier resets daily at 00:00 UTC. Check `console.groq.com/keys`.

If `BENCH_MODE=v1` and one provider is down → fallback to `BENCH_MODE=dev` (Groq free trio) to keep moving.

### 5. Continue a partial cycle

```sql
UPDATE cycles SET status='queued' WHERE id = <ID> AND status='partial';
UPDATE run_jobs SET status='queued' WHERE cycle_id = <ID> AND status='error';
```

Then `BENCH_BUDGET_USD=20 npm run bench`.

### 6. Refresh rankings if no progress visible

The `rankings` materialized view is refreshed every N completed outputs (BENCH_REFRESH_EVERY=25). If the live drip isn't showing :
```sql
SELECT refresh_rankings();
```

## Output

The skill emits :

```
# Versuz bench debug — cycle 47

## State
- status      : running (stuck 2h12m)
- scope       : skills.document
- jobs        : 60 total · 15 queued · 1 running · 42 completed · 2 errored
- agent calls : 42 OK · 0 errors (last 1h)
- judge calls : 121 OK · 6 errors (all on judge=claude-haiku-4-5)
- budget used : $1.42 / $5.00

## Diagnosis
Anthropic judge has 6 consecutive 529 errors → rate-limit hit.
Job 4711 is `running` since 1h45 → likely orphan.

## Fix
1. SQL: UPDATE run_jobs SET status='queued' WHERE id=4711;
2. BENCH_JUDGE_COUNT=2 npm run bench   # skip Anthropic this run
3. After cycle completes, validate at /admin/cycles
```

## Related skills

- `vz-sql-migrate` to apply missing migrations
- `vz-launch-check` to verify env vars
