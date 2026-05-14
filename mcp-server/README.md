<div align="center">

# **`@versuz/mcp`**

### The MCP server for the [Versuz](https://versuz.dev) marketplace.

Plug Claude Code into the open Versuz registry. Browse, inspect and install skills + CLAUDE.md as **native tools**, without leaving your conversation.

**Beta** · MIT · [Source](https://github.com/TomaTV/versuz/tree/main/mcp-server)

</div>

---

## What it does

[Model Context Protocol](https://modelcontextprotocol.io) is Anthropic's standard for letting Claude Code call external tools. `@versuz/mcp` exposes the Versuz catalog as 5 tools, so you can say things like :

> *"find me a SQL migration skill and install it"*

> *"list the top 10 CLAUDE.md files for Next.js projects"*

> *"show me the prior score and Elo for the `pdf-pro` skill"*

Claude calls the tools, summarises results, downloads the right files. No copy/paste, no browser switch.

## Install

```bash
claude mcp add versuz npx -y @versuz/mcp
```

Or manual via `.mcp.json` in your project :

```json
{
  "mcpServers": {
    "versuz": {
      "command": "npx",
      "args": ["-y", "@versuz/mcp"],
      "env": {
        "VERSUZ_API": "https://versuz.dev"
      }
    }
  }
}
```

Restart Claude Code. The 5 Versuz tools appear in the tool list.

## Tools exposed

| Tool | Description |
|---|---|
| `versuz_search` | Full-text search across skills + CLAUDE.md. Returns top 15 of each kind. |
| `versuz_list_skills` | Paginated browse with `category` / `tier` / `sort` filters. |
| `versuz_list_claude_md` | Same shape for CLAUDE.md (categories : nextjs · react · python-data · backend-api · mobile · devops · ml-training · generic). |
| `versuz_get` | Full details for a slug — Elo, prior, license, GitHub URL, bundle files, tools, model. |
| `versuz_install` | Download to `.claude/skills/<slug>/SKILL.md` (skill) or `./CLAUDE.md` (claude_md). Free items only. Premium returns a `buy_url`. |

## Example session

**You** : *"I need a skill that can extract tables from PDFs."*

**Claude** :
```
[invoking versuz_search({query: "pdf table extraction"})]

Found 3 candidates :
- pdf-table-extractor (prior 1721, ★ 8.2k, FEATURED $4.99)
- pdf-extract-anthropic (prior 1846, ★ 12.4k, FREE)
- table-from-pdf-claude (prior 1432, ★ 950, FREE)

Recommend pdf-extract-anthropic — highest prior + free. Install ?
```

**You** : *"yes"*

**Claude** :
```
[invoking versuz_install({slug: "pdf-extract-anthropic"})]

✓ Wrote .claude/skills/pdf-extract-anthropic/SKILL.md (3.2 KB)
Source : github.com/anthropics/skills/blob/main/pdf-extract/SKILL.md
```

## Config

| Env var | Default | Effect |
|---|---|---|
| `VERSUZ_API` | `https://versuz.dev` | API host. Set to `http://localhost:3000` for local dev. |

You can also pass via the MCP config :

```json
{
  "mcpServers": {
    "versuz": {
      "command": "npx",
      "args": ["-y", "@versuz/mcp"],
      "env": { "VERSUZ_API": "http://localhost:3000" }
    }
  }
}
```

## Install paths

Tools write files relative to **the project root where Claude Code is running**, not where the MCP server is :

| Kind | Destination |
|---|---|
| `skill` | `<project>/.claude/skills/<slug>/SKILL.md` |
| `claude_md` | `<project>/CLAUDE.md` |

Override via the `cwd` argument on `versuz_install` if needed.

## Premium handling

Premium items return `402 Payment Required` from the API. The MCP server forwards a clear message :

```
Error: Premium skill — purchase required to download via MCP.
Buy at: https://versuz.dev/buy/skill/<slug>
```

Once you've purchased on the web, future installs will work (in v0.2 — currently the MCP doesn't pass user auth, only free items are downloadable).

## Bundle support (v0.2)

Same caveat as the CLI : bundled skills (SKILL.md + scripts/refs) download only the SKILL.md for now. A `bundle: true` arg on `versuz_install` is on the roadmap once `/api/v1/skills/<slug>/bundle.zip` ships.

## Roadmap (v0.2)

- [ ] **`versuz_submit`** tool — publish a skill from your own GitHub repo (mirrors CLI)
- [ ] **GitHub Device Flow auth** — for premium downloads via MCP
- [ ] **Bundle download** — zip support
- [ ] **`versuz_judge`** — kick a quality-judge run from MCP (admin only)

## Development

```bash
cd mcp-server
npm install
node bin/server.js          # runs on stdio, waits for MCP client
```

The server logs `[versuz-mcp] running on stdio · api=<url>` to stderr on startup. stdout is reserved for the MCP protocol.

Test it standalone with [`@modelcontextprotocol/inspector`](https://modelcontextprotocol.io/docs/tools/inspector) :

```bash
npx @modelcontextprotocol/inspector node bin/server.js
```

## Stack

- `@modelcontextprotocol/sdk` ^1.0
- Stdio transport (no network listener)
- Pure Node 18+, ESM

## License

MIT — see [LICENSE](../LICENSE).
