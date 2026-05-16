<div align="center">

# **`npx versuz`**

### The CLI for the [Versuz](https://versuz.dev) marketplace.

Browse, search, inspect, install — and publish your own — Claude skills + CLAUDE.md from the terminal.

```
██╗   ██╗███████╗██████╗ ███████╗██╗   ██╗███████╗
██║   ██║██╔════╝██╔══██╗██╔════╝██║   ██║╚══███╔╝
██║   ██║█████╗  ██████╔╝███████╗██║   ██║  ███╔╝ 
╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║   ██║ ███╔╝  
 ╚████╔╝ ███████╗██║  ██║███████║╚██████╔╝███████╗
  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝
```

**Beta** · MIT · [Source](https://github.com/TomaTV/versuz/tree/main/cli)

</div>

---

## Quickstart

```bash
# Interactive mode (no install required)
npx versuz

# Or as a permanent command
npm install -g versuz
versuz
```

The interactive prompt walks you through search → install. No login required for free items.

## Commands

### Browsing

```bash
versuz search <query>             # full-text across skills + CLAUDE.md
versuz list                       # browse skills (paginated)
versuz list --kind=claude-md      # browse CLAUDE.md files
versuz list --category=document --tier=free --q=pdf
versuz info <slug>                # full details (Elo, prior, license, GitHub)
```

### Installing

```bash
versuz install <slug>             # → .claude/skills/<slug>/SKILL.md
versuz install <slug> --kind=claude-md   # → ./CLAUDE.md (project root)
```

Free items download directly. Premium items return a buy URL — purchase via the web first, then install.

### Publishing your own

```bash
versuz login                      # auth with GitHub PAT (read:user scope)
versuz whoami                     # confirm signed-in user
versuz submit <github-url>        # share a SKILL.md from your repo
versuz submit <github-url> --kind=claude-md
versuz logout                     # clear local auth
```

### Battle (v0.2)

Head-to-head terminal viz of two benched skills (or CLAUDE.md). Used in the
20-second social videos that ship on each cycle's "Today's Upset" — rank,
avg score, judge consensus, animated reveal of the winner.

```bash
versuz battle pdf-extract-anthropic vs pdf-pro
versuz battle nextjs-supabase nextjs-prisma                    # `vs` is optional
versuz battle anthropics-cc-best simonw-cc-best --kind=claude-md
```

### Misc

```bash
versuz --version
versuz --help
versuz --api=https://localhost:3000   # override API host
```

## Beautiful output

The CLI uses :
- **figlet** (ANSI Shadow) for the gradient ember logo
- **cli-table3** + **chalk** for color-coded result tables
- **ora** for spinners
- **boxen** for detail panels
- **prompts** for interactive flows

Result table example :

```
┌──────────────────────────────────────┬──────────────┬────────┬────────┬────────────┐
│ SLUG                                 │ CATEGORY     │ PRIOR  │ ★      │ TIER       │
├──────────────────────────────────────┼──────────────┼────────┼────────┼────────────┤
│ pdf-extract-anthropic                │ document     │ 1846   │ 12.4k  │  free      │
│ pdf-table-extractor                  │ document     │ 1721   │ 8.2k   │ ★ FEATURED │
│ pdf-pro                              │ document     │ 1604   │ 3.1k   │  PREMIUM   │
└──────────────────────────────────────┴──────────────┴────────┴────────┴────────────┘
```

## Install paths

| Kind | Destination |
|---|---|
| `skill` | `./.claude/skills/<slug>/SKILL.md` |
| `claude_md` | `./CLAUDE.md` (at project root) |

The CLI creates intermediate directories. Existing files trigger a confirm prompt (skip with `--overwrite`).

## Bundle support

Some skills are bundled (SKILL.md + scripts/refs/assets). The current CLI downloads only the SKILL.md and prints the GitHub URL for the full bundle — `git clone` it manually for now.

A `versuz install --bundle` flag is on the roadmap (v0.3) once `/api/v1/skills/<slug>/bundle.zip` ships.

## Publishing : how it works

`versuz submit` is gated by **8 anti-spam layers** :

1. **GitHub PAT required** (`versuz login`) — verified against `GET /user`
2. **Owner-or-org-member only** — you can only submit repos you own or are a member of (verified via `GET /orgs/<org>/members/<you>`)
3. **Rate limit** : 5 submissions / hour / GitHub user ID
4. **URL dedup** : same URL refused if submitted in last 24h
5. **Strict github.com regex** — no random URLs
6. **Size cap** : 200 KB max per file
7. **Free tier hardcoded** — premium listings go through the web for Stripe Connect
8. **Full audit trail** — every attempt logged (success / duplicate / rejected / error)

If you pass all checks, your item is auto-verified to **level 1 (claimed)** since GitHub already vouched for ownership.

## Auth storage

Local PAT lives at `~/.versuz/auth.json` (chmod 600 on Unix). Contains :

```json
{
  "token": "ghp_xxx",
  "login": "your-github-username",
  "id": 12345678,
  "saved_at": "2026-05-11T12:00:00Z"
}
```

`versuz logout` deletes the file. No data leaves your machine except on `submit`.

## Config

| Env var | Default | Effect |
|---|---|---|
| `VERSUZ_API` | `https://versuz.dev` | API host override |

CLI flag `--api=<url>` also works (overrides env).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Fetch/install error or auth rejected |
| `2` | Missing required argument |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot reach <url>` | Set `VERSUZ_API` or use `--api=<url>`. Default is `https://versuz.dev`. |
| `401 Token rejected` | Run `versuz login` again. PAT may have been revoked. |
| `403 not owner/member` | You can only submit your own repos. Fork it to your account if it's not yours. |
| `429 Rate limit` | 5 submissions per hour, retry later. |
| `409 already submitted` | Same URL refused if submitted in last 24h. |

## Development

```bash
cd cli
npm install
node bin/versuz.js          # run locally
npm link                    # make `versuz` available globally
```

Built with ESM, no transpilation. Node 18+ required.

## License

MIT — see [LICENSE](../LICENSE).
