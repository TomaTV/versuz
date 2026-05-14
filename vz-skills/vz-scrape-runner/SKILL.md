---
name: vz-scrape-runner
description: Launch a targeted Versuz scrape against GitHub, Sourcegraph, or curated awesome-list aggregators with smart defaults. Picks the right scraper based on the target (owner, topic, aggregator), sets reasonable batch sizes and rate-limit windows, monitors progress, and surfaces meaningful logs vs noise. Use when you need to ingest a specific repo / org / topic into Versuz without remembering 12 environment variables.
tools: ["bash", "read"]
model: claude-opus-4-7
license: Versuz Featured
---

# vz-scrape-runner

Versuz has 4 scrapers (`scrape`, `scrape-claude-md`, `scrape-codesearch`, `scrape-aggregators`) and dozens of env vars (GITHUB_TOKENS, SCRAPE_BATCH, SCRAPE_CONCURRENCY, GITHUB_TOPICS_MAX_PAGES, …). This skill picks the right one for your intent and runs it with sane defaults.

## When to use

- **"Index everything from anthropics/skills"** → scrape with owner filter
- **"Catch up on cursor-rules"** → scrape-aggregators (PatrickJS/awesome-cursorrules)
- **"Find all new SKILL.md from last week"** → scrape-codesearch with date filter
- **"Re-run scrape on already-known repos to refresh stars"** → scrape --force-update

## When NOT to use

- For a 1-shot manual ingest of a single file → use the CLI : `npx versuz submit <github-url>`
- For backfilling old data without changing logic → use the migration system instead

## Inputs the skill needs

The skill prompts for / infers :

1. **Target shape** — one of :
   - `--owner=X` : scrape everything from one GitHub owner
   - `--topic=X` : scrape all repos tagged with topic X
   - `--aggregator=NAME` : run one specific awesome-list source from `scripts/scrape-aggregators/sources.mjs`
   - `--keyword=X` : full code-search across GitHub for SKILL.md mentioning X
   - `--full` : nightly catch-up (all scrapers, batch=20, 4h budget)
2. **Token budget** — defaults to whatever's in `GITHUB_TOKENS`. Reports remaining quota mid-run.
3. **Kind filter** — `skill`, `claude_md`, or both (default).
4. **Dry-run** — if user wants to see what *would* be scraped without writing.

## Output

A summary table after the run :

```
[scrape] mode=topic target=mcp-server
  • candidates found : 312
  • new (not in DB)  : 89
  • skipped (sha)    : 223
  • scraped OK       : 87
  • rejected (parser/classifier) : 2
  • license captured : 81 / 87
  • content dups dropped : 4
  • duration : 8m12s
  • API calls : 1245 (target 1500 budget)
  • next step : run `vz-bench-debug` to enqueue these new items
```

## Recipes

### Catch up on a hot topic
```
node scripts/scrape-aggregators/index.mjs --topic=mcp-server --batch=10
```

### Re-scrape a known repo (refresh license, stars)
```
SCRAPE_BATCH=1 node scripts/scrape/index.mjs --keyword="anthropics" --force-update --max-pages=2
```

### Smoke test (no DB write)
```
node scripts/scrape/index.mjs --keyword=pdf --max-pages=1 --dry-run
```

### Nightly full catch-up
```
npm run pipeline:full
```
(scrape → quality → bench, ~8-12h)

## Common failures + fixes

- **403 on every search call** → your GITHUB_TOKENS bucket is exhausted. Wait for the next reset window (X-RateLimit-Reset header) or add another PAT.
- **`code-search hit 1000-result ceiling`** → GitHub caps `search.code` at 1000 results per query. Narrow with `language:markdown stars:>10` chunks.
- **`upsert error: invalid input syntax for type uuid`** → migration 0040 not applied (categories column missing). Run `supabase db push`.
- **Items appear in DB but never on /marketplace** → check `is_archived = false` filter. Try `?include_archived=1` to peek.

## Related skills

- `vz-bench-debug` after scrape, to judge the new items
- `vz-launch-check` to verify all env vars are set before you start
