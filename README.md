<div align="center">

![Versuz Banner](/public/vz-banner.png)

# **Versuz**

### *Skills go in. Only one wins.*

The open public benchmark for AI agent skills.

Versuz indexes every public Claude skill and CLAUDE.md on GitHub, runs them through 5 held-out tasks, lets three frontier LLMs judge the outputs, and publishes a ranking based on actual performance, not stars.

**Free · Open · Updated daily**

🌐 [versuz.dev](https://versuz.dev) · 📦 [`npx versuz`](./cli) · 🔌 [`@versuz/mcp`](./mcp-server) · 📚 [Methodology](https://versuz.dev/methodology)

</div>

---

## Why it exists

In May 2026, the Claude Code ecosystem already lists 4,200+ skills on `claudemarketplaces.com` and 1.2M+ on `skillsmp.com`. Anthropic has shipped its own enterprise marketplace. None of them answer the only question a developer actually asks :

> *"Of the 47 skills claiming to do task X, which one actually works?"*

Existing directories rank by **stars** and **installs** — popularity, not quality. **Versuz benchmarks the outputs.** Three frontier judges grade every skill against the same task suite, and the winners rank #1 in their category.

It's LMArena, but for agent skills.

## What's indexed

| | Count (May 2026) | Auto-discovered from |
|---|---|---|
| **SKILL.md** files | ~2,590 | GitHub Code Search · Sourcegraph · 14 awesome-* lists · 26 GitHub Topics |
| **CLAUDE.md** files | ~3,474 | Same pipeline |
| **Quality-judged** | ~714 (and growing) | LLM 5-axis judge (Groq Llama / Gemini / OpenRouter) |
| **Bench-judged Elo** | Active (cycle #21 live) | Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini via OpenRouter |
| **Categories** | 6 skill + 8 CLAUDE.md | document · sql · data · web · shell · code · nextjs · react · python-data · backend-api · mobile · devops · ml-training · generic |
| **Official orgs flagged** | ~30 | anthropics, openai, google, vercel, stripe, supabase, etc. |

## Three commercial tiers

- **Free** — scraped public, verified progressively (5-level trust ladder : `claimed → verified → reviewed → featured`)
- **Premium** — author-listed, fixed price, Versuz takes 30% / author keeps 70% via Stripe Connect Express
- **Featured** — Versuz first-party curation, 100% Versuz

## Consume Versuz from anywhere

### Web UI

[**versuz.dev/marketplace**](https://versuz.dev/marketplace) — full registry with filters (kind, category, tier, trust level, quality, tokens, official, topic).

### CLI (beta)

```bash
npx versuz                          # interactive mode
npx versuz search pdf               # cross-kind full-text search
npx versuz install <slug>           # download to .claude/skills/<slug>/
npx versuz login                    # auth with GitHub PAT
npx versuz submit <github-url>      # share your skill (own repo only)
```

→ [Full CLI docs](./cli/README.md)

### MCP server (beta)

```bash
claude mcp add versuz npx -y @versuz/mcp
```

Claude Code now has 5 native tools : `versuz_search`, `versuz_list_skills`, `versuz_list_claude_md`, `versuz_get`, `versuz_install`. Ask *"find me a PDF skill and install it"* — Claude searches, inspects, downloads, all inline.

→ [Full MCP docs](./mcp-server/README.md)

### Open data

- `GET /api/v1/skills` · `GET /api/v1/skills/<slug>` · `/content`
- `GET /api/v1/claude-md` · same shape
- `GET /feed/skills` · `GET /feed/claude-md` — RSS 2.0
- `GET /sitemap.xml`
- Per-item embed badges : `/badge/<kind>/<slug>` (SVG)

## How it works (short)

1. **Discover** — multi-source scrape (GitHub Code Search + Sourcegraph + awesome-* aggregators) with multi-token rotation, content-hash dedup, official-org auto-flag.
2. **Score** — LLM 5-axis quality judge (clarity, specificity, completeness, structure, usefulness) on every item. Mean 67/100, target distribution N(65, 12).
3. **Benchmark** — for each category, every skill runs through 5 held-out tasks (N=5 = statistically validated sweet spot). Output dedup by content hash so identical runs are reused.
4. **Judge** — 3 frontier LLMs grade each output independently. Judge dedup by output hash. Prompt cache hits ~82%, cutting input cost by ~57%.
5. **Aggregate** — Bayesian Elo per category. Refreshed every 15 min via Vercel cron.

Full methodology : [versuz.dev/methodology](https://versuz.dev/methodology).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router · Turbopack · React Compiler) · React 19 · JavaScript |
| Styling | Tailwind v4 (`@theme inline`) · Instrument Serif + Geist + JetBrains Mono |
| Backend | Next.js API routes · Postgres via Supabase · service-role admin client |
| Storage | Supabase Storage (`premium-content` bucket, private + signed URLs) |
| Hosting | Vercel · 6 daily/weekly crons |
| Auth | Supabase Auth + GitHub OAuth |
| Payments | Stripe Connect Express + destination charges (70/30) |
| Email | Resend SMTP (welcome + branded receipts) |
| Bench | Pure Node in `scripts/bench/` · OpenRouter (1 key, 200+ models) · multi-tier modes (`dev` / `v1` / `or-v1` / `prod` / `gold`) |
| CLI | Pure Node + figlet + chalk + cli-table3 + ora + prompts |
| MCP | `@modelcontextprotocol/sdk` |

## Local dev

```bash
git clone https://github.com/TomaTV/versuz
cd versuz
npm install
cp .env.local.example .env.local   # fill Supabase, Stripe, Resend, GitHub PATs
npm run dev                        # http://localhost:3000
```

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Prod build & run |
| `npm run scrape:skills` | Scrape SKILL.md via GitHub Code Search |
| `npm run scrape:claude-md` | Same for CLAUDE.md |
| `npm run scrape:aggregators` | 14 awesome-* + 8 GitHub Topics |
| `npm run scrape:codesearch` | Sourcegraph stream API |
| `npm run scrape:max` | Exhaustive mode (40 sub-queries × 2 kinds) |
| `npm run scrape:all` | All scrapers chained |
| `npm run bench` | Run a queued cycle (agent + judge + refresh) |
| `npm run bench:quality` | LLM quality judge on un-judged items |
| `npm run seed` | Push fixtures to Supabase |

### Env vars (essentials)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_TOKENS=ghp_xxx,ghp_yyy,ghp_zzz   # multi-token rotation
OPENROUTER_API_KEY=                     # bench mode or-v1
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
ADMIN_GITHUB_LOGINS=YourGitHubLogin
```

## Repo layout

```
versuz/
├── src/                     # Next.js app + lib + components
│   ├── app/                 # App Router pages + /api routes
│   ├── components/          # Brand, site, marketplace, motion, …
│   └── lib/                 # queries, auth, stripe, supabase, …
├── scripts/                 # Node scrapers + bench engine
│   ├── scrape/              # GitHub Code Search (SKILL.md)
│   ├── scrape-claude-md/    # GitHub Code Search (CLAUDE.md)
│   ├── scrape-aggregators/  # 14 awesome-* + 8 topics
│   ├── scrape-codesearch/   # Sourcegraph adapter
│   └── bench/               # Agent + judge + cycle orchestrator
├── supabase/migrations/     # 22 SQL migrations
├── cli/                     # `npx versuz` CLI package
├── mcp-server/              # `@versuz/mcp` MCP server package
├── docs/                    # Go-live checklists (stripe, domain, cli-mcp)
├── .ui/                     # Design reference (Claude Design v1)
├── CONTEXT.md               # Long-form project context
├── CLAUDE.md                # Agent working agreement
└── TODO.md                  # Task list
```

## Bench cost calculator

Mode `or-v1` (default) : **Haiku 4.5 + DeepSeek V4 Flash + GPT-5 mini** via OpenRouter. One key, one dashboard.

| Scale | Outputs | Judge scores | Cost (with ~82% cache hit) |
|---|---|---|---|
| 100 skills × 5 tasks | 500 | 1,500 | **~$1.60** |
| 1,000 skills × 5 tasks | 5,000 | 15,000 | **~$16** |
| **5,000 skills × 5 tasks** | 25,000 | 75,000 | **~$80** |
| Full catalog (~5,200) | 26,000 | 78,000 | **~$83** |

**Why some judges cost more** : DeepSeek V4 Flash emits internal *reasoning tokens* (Chain-of-Thought) before the JSON score. These invisible tokens are billed but not shown. A cap of 900 output tokens keeps reasoning concise without truncating the JSON. Override via `BENCH_JUDGE_MAX_TOKENS`.

**Optimisations available** :
- `BENCH_JUDGE_COUNT=2` → cut judge calls by 33%, save ~$27 on 5k skills
- `BENCH_JUDGE_MAX_TOKENS=500` → squeeze DeepSeek reasoning further, save ~$15 on 5k skills
- `BENCH_MODE=or-thrift` → single judge (GPT-5 nano), **~$0.86/day**
- `BENCH_MODE=dev` → 3 free Groq Llama models, $0 (3000 RPD cap)

## Roadmap

- ✅ **V0** — public marketplace, scraping pipeline, quality judge, CLI v0.1, MCP v0.1
- ✅ **V0.5** — bench engine live (or-v1 with prompt cache), first cycles completed
- ⏳ **V1** — domain launch, Stripe live mode, full catalog bench
- 🔮 **V2** — real-time battles (LMArena-style), dark theme, API plans for companies

→ Full plan in [TODO.md](./TODO.md).

## Built by

[FlukX Studio](https://flukxstudio.fr) — Toma, solo build from France. EdTech automation + design + full-stack.

## License

MIT — see [LICENSE](./LICENSE).

---

<div align="center">
<sub>made with ember</sub>
</div>
