/**
 * Versuz MCP server — exposes the marketplace catalog as MCP tools.
 *
 * Tools :
 *   - versuz_search       — full-text search across skills + CLAUDE.md
 *   - versuz_list_skills  — paginated browse
 *   - versuz_list_claude_md
 *   - versuz_get          — full details (Elo, Prior, license, github)
 *   - versuz_install      — download SKILL.md to `.claude/skills/<slug>/`
 *                           or CLAUDE.md to project root
 *
 * Config (.mcp.json) :
 *   {
 *     "versuz": {
 *       "command": "npx",
 *       "args": ["-y", "@versuz/mcp"],
 *       "env": { "VERSUZ_API": "https://versuz.dev" }
 *     }
 *   }
 *
 * VERSUZ_API defaults to https://versuz.dev for prod; switch to
 * http://localhost:3000 for local dev via the env var above.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = (process.env.VERSUZ_API || "https://versuz.dev").replace(/\/$/, "");

async function api(pathStr, params = {}) {
  const url = new URL(`${API_BASE}${pathStr}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "versuz-mcp/0.1.0" },
  });
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {}
    throw new Error(body?.error || `${res.status} ${res.statusText} on ${url.pathname}`);
  }
  return res.json();
}

const TOOLS = [
  {
    name: "versuz_search",
    description:
      "Search the Versuz marketplace for Claude skills and CLAUDE.md files. Returns up to 15 matches per kind, ranked by prior + stars. Use when the user asks to find a skill for a task (e.g. 'PDF generation', 'database migration') or a CLAUDE.md for a project type.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term (matches name, slug, description, author, repo)" },
      },
      required: ["query"],
    },
  },
  {
    name: "versuz_list_skills",
    description:
      "List Claude skills from the marketplace. Filter by category, tier, or sort order. Use to browse what's available before installing.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category id (document, sql, data, web, shell, code)" },
        tier: { type: "string", description: "free, premium, or featured", enum: ["free", "premium", "featured"] },
        sort: { type: "string", description: "prior, quality, stars, recent, name", enum: ["prior", "quality", "stars", "recent", "name"] },
        limit: { type: "number", description: "Max items (default 30, max 100)" },
      },
    },
  },
  {
    name: "versuz_list_claude_md",
    description:
      "List CLAUDE.md project-context files from the marketplace. Filter by category (nextjs, react, python-data, backend-api, mobile, devops, ml-training, generic).",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Project category id" },
        tier: { type: "string", description: "free, premium, or featured", enum: ["free", "premium", "featured"] },
        sort: { type: "string", enum: ["prior", "quality", "stars", "recent", "name"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "versuz_get",
    description:
      "Get full details for a specific skill or CLAUDE.md by slug — Elo, prior, license, GitHub link, bundle files, etc. Useful before deciding to install.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The item slug, e.g. 'pdf-generator'" },
        kind: { type: "string", enum: ["skill", "claude_md"], description: "Default: skill" },
      },
      required: ["slug"],
    },
  },
  {
    name: "versuz_install",
    description:
      "Install a skill (writes to .claude/skills/<slug>/SKILL.md) or a CLAUDE.md (writes to ./CLAUDE.md at project root). Only free items are installable via MCP — premium items return a buy URL the user must visit first.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The item slug" },
        kind: { type: "string", enum: ["skill", "claude_md"], description: "Default: skill" },
        cwd: {
          type: "string",
          description:
            "Project root to install into. Defaults to MCP server cwd. Pass an absolute path to install elsewhere.",
        },
        overwrite: { type: "boolean", description: "Overwrite existing file without prompting (default false)" },
      },
      required: ["slug"],
    },
  },
];

async function handleSearch({ query }) {
  const [skills, claudeMds] = await Promise.all([
    api("/api/v1/skills", { q: query, limit: 15 }),
    api("/api/v1/claude-md", { q: query, limit: 15 }),
  ]);
  const lines = [
    `# Versuz search: "${query}"`,
    "",
    `Found ${skills.items?.length || 0} skill(s) + ${claudeMds.items?.length || 0} CLAUDE.md.`,
    "",
  ];
  if (skills.items?.length) {
    lines.push("## Skills");
    for (const s of skills.items) {
      lines.push(`- **${s.slug}** · ${s.category} · prior ${s.prior ?? "—"} · ★ ${s.stars ?? 0} · ${s.tier}`);
      if (s.description) lines.push(`  ${s.description.slice(0, 140)}`);
    }
    lines.push("");
  }
  if (claudeMds.items?.length) {
    lines.push("## CLAUDE.md");
    for (const c of claudeMds.items) {
      lines.push(`- **${c.slug}** · ${c.project_category} · ★ ${c.stars ?? 0} · ${c.tier}`);
      if (c.description) lines.push(`  ${c.description.slice(0, 140)}`);
    }
  }
  return lines.join("\n");
}

async function handleList({ kind, category, tier, sort, limit }) {
  const path = kind === "claude_md" ? "/api/v1/claude-md" : "/api/v1/skills";
  const data = await api(path, { category, tier, sort, limit: limit || 30 });
  const items = data.items || [];
  const lines = [`# ${kind === "claude_md" ? "CLAUDE.md" : "Skills"} (${items.length} of ${data.total ?? "?"})`, ""];
  for (const it of items) {
    const cat = it.category || it.project_category || "—";
    lines.push(`- **${it.slug}** · ${cat} · prior ${it.prior ?? "—"} · ★ ${it.stars ?? 0} · ${it.tier}`);
  }
  return lines.join("\n");
}

async function handleGet({ slug, kind }) {
  const path = kind === "claude_md" ? `/api/v1/claude-md/${slug}` : `/api/v1/skills/${slug}`;
  const data = await api(path);
  const item = data.item;
  return JSON.stringify(item, null, 2);
}

async function handleInstall({ slug, kind, cwd, overwrite }) {
  const k = kind === "claude_md" ? "claude_md" : "skill";
  const contentPath =
    k === "claude_md" ? `/api/v1/claude-md/${slug}/content` : `/api/v1/skills/${slug}/content`;
  const payload = await api(contentPath);
  const root = cwd || process.cwd();

  if (k === "claude_md") {
    const target = path.join(root, "CLAUDE.md");
    if (!overwrite) {
      try {
        await fs.access(target);
        return `CLAUDE.md already exists at ${target}. Pass overwrite=true to replace.`;
      } catch {}
    }
    await fs.writeFile(target, payload.content, "utf8");
    return `✓ Wrote CLAUDE.md (${payload.content.length} chars) to ${target}\nSource: ${payload.github_url || "—"}`;
  }
  const dir = path.join(root, ".claude", "skills", slug);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, "SKILL.md");
  if (!overwrite) {
    try {
      await fs.access(target);
      return `SKILL.md already exists at ${target}. Pass overwrite=true to replace.`;
    } catch {}
  }
  await fs.writeFile(target, payload.content, "utf8");
  const bundleNote = payload.bundle_files?.length
    ? `\nNote: this skill has ${payload.bundle_files.length} bundle file(s). Clone the repo for the full bundle: ${payload.github_url}`
    : "";
  return `✓ Wrote ${target} (${payload.content.length} chars)${bundleNote}\nSource: ${payload.github_url || "—"}`;
}

export async function startServer() {
  const server = new Server(
    { name: "versuz", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    try {
      let text;
      if (name === "versuz_search") text = await handleSearch(args);
      else if (name === "versuz_list_skills") text = await handleList({ ...args, kind: "skill" });
      else if (name === "versuz_list_claude_md") text = await handleList({ ...args, kind: "claude_md" });
      else if (name === "versuz_get") text = await handleGet(args);
      else if (name === "versuz_install") text = await handleInstall(args);
      else throw new Error(`Unknown tool: ${name}`);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[versuz-mcp] running on stdio · api=" + API_BASE);
}
