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
    headers: { Accept: "application/json", "User-Agent": "versuz-mcp/0.2.0" },
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
  {
    name: "versuz_battle",
    description:
      "Head-to-head comparison of two skills or CLAUDE.md files. Returns rank, bench score, prior, stars, tier, and a verdict (winner + delta). Use when the user asks to compare two items, pick a winner, or decide between options. Examples : 'compare pdf-generator vs anthropic-pdf', 'which is better : nextjs-supabase or nextjs-prisma'.",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "string", description: "First item slug" },
        b: { type: "string", description: "Second item slug" },
        kind: {
          type: "string",
          enum: ["skill", "claude_md"],
          description: "Default: skill. Both items must be the same kind.",
        },
      },
      required: ["a", "b"],
    },
  },
  {
    name: "versuz_submit",
    description:
      "Submit a SKILL.md or CLAUDE.md from a public GitHub repo to the Versuz registry. Requires a GitHub Personal Access Token (PAT) configured via VERSUZ_GITHUB_TOKEN env var — the same token format as `npx versuz login`. Only the repo owner or a verified org member can submit. Free tier only via MCP ; premium submissions go through the web at versuz.dev/submit. Use when the user asks to publish their skill on Versuz, share a SKILL.md they wrote, or list their repo.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "Public GitHub URL of the SKILL.md or CLAUDE.md (e.g. 'https://github.com/owner/repo' or with /blob/main/SKILL.md). Owner-or-org-member only.",
        },
        kind: {
          type: "string",
          enum: ["skill", "claude_md"],
          description: "Default: skill. Use claude_md for CLAUDE.md files.",
        },
      },
      required: ["url"],
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

async function handleSubmit({ url, kind }) {
  if (!url) throw new Error("Missing `url` — pass a public GitHub URL");
  const token = process.env.VERSUZ_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return [
      "**Submission requires a GitHub PAT.**",
      "",
      "Configure the MCP server with `VERSUZ_GITHUB_TOKEN=ghp_...` in your `.mcp.json` env block, then retry. The token needs the `read:user` scope minimum (we don't write to your repos).",
      "",
      "Create one at https://github.com/settings/tokens/new — same format as `npx versuz login`.",
    ].join("\n");
  }

  const k = kind === "claude_md" ? "claude_md" : "skill";
  const res = await fetch(`${API_BASE}/api/v1/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "User-Agent": "versuz-mcp/0.2.0",
    },
    body: JSON.stringify({ kind: k, url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error || `${res.status} ${res.statusText}`;
    return `**Submission failed.** ${reason}\n\nCommon causes : (1) you don't own the repo or aren't an org member, (2) rate-limited (5 submits/hour), (3) URL already submitted in the last 24h, (4) malformed SKILL.md.`;
  }

  const slug = data?.item?.slug || data?.slug;
  const detailUrl = slug
    ? `${API_BASE}/${k === "claude_md" ? "claude-md" : "skills"}/${slug}`
    : null;
  const badgeMd = slug
    ? `[![Versuz](${API_BASE}/badge/${k === "claude_md" ? "claude-md" : "skill"}/${slug})](${detailUrl})`
    : null;

  return [
    `**✓ Submitted to Versuz.**`,
    "",
    slug ? `Slug : \`${slug}\`` : "",
    detailUrl ? `Detail page : ${detailUrl}` : "",
    "",
    "**Next 4 hours :** the quality judge will score it (5-axis rubric).",
    "**Next 24 hours :** it enters the bench rotation — ELO ranking starts.",
    "",
    badgeMd
      ? `**Badge for your README :**\n\`\`\`markdown\n${badgeMd}\n\`\`\``
      : "",
    "",
    "Reply with feedback at contact@flukxstudio.fr — every message reaches a real human.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleBattle({ a, b, kind }) {
  if (!a || !b) throw new Error("Both a and b slugs are required");
  const k = kind === "claude_md" ? "claude_md" : "skill";
  const base = k === "claude_md" ? "/api/v1/claude-md" : "/api/v1/skills";
  const [resA, resB] = await Promise.all([api(`${base}/${a}`), api(`${base}/${b}`)]);
  const itemA = resA.item;
  const itemB = resB.item;
  if (!itemA || !itemB) {
    throw new Error(`Not found: ${!itemA ? a : ""}${!itemA && !itemB ? " and " : ""}${!itemB ? b : ""}`);
  }

  // Composite score for comparison — prefer Elo (benched), else quality
  // prior. Items at the same tier of signal compare cleanly ; mixed
  // signals are flagged so the model doesn't pretend they're equivalent.
  const score = (it) =>
    it.elo != null
      ? { value: Number(it.elo), kind: "elo" }
      : it.prior != null
        ? { value: Number(it.prior), kind: "prior" }
        : { value: null, kind: "—" };

  const sA = score(itemA);
  const sB = score(itemB);

  let verdict;
  if (sA.value == null && sB.value == null) {
    verdict = "Neither item has been scored yet. No verdict.";
  } else if (sA.value == null) {
    verdict = `**${itemB.slug}** wins by default — only one has a score (${sB.value.toFixed(1)} ${sB.kind}).`;
  } else if (sB.value == null) {
    verdict = `**${itemA.slug}** wins by default — only one has a score (${sA.value.toFixed(1)} ${sA.kind}).`;
  } else if (sA.kind !== sB.kind) {
    verdict = `Mixed signals : **${itemA.slug}** has ${sA.kind} ${sA.value.toFixed(1)}, **${itemB.slug}** has ${sB.kind} ${sB.value.toFixed(1)}. Not directly comparable — the benched item is more trustworthy.`;
  } else {
    const delta = sA.value - sB.value;
    const winner = delta > 0 ? itemA : itemB;
    const loser = delta > 0 ? itemB : itemA;
    const margin = Math.abs(delta);
    const magnitude =
      margin < 2
        ? "marginal"
        : margin < 8
          ? "clear"
          : margin < 20
            ? "decisive"
            : "dominant";
    verdict = `**${winner.slug}** wins (${magnitude} — Δ ${margin.toFixed(1)} ${sA.kind}). ${winner.slug} = ${winner === itemA ? sA.value.toFixed(1) : sB.value.toFixed(1)}, ${loser.slug} = ${winner === itemA ? sB.value.toFixed(1) : sA.value.toFixed(1)}.`;
  }

  const detailPath = (it) =>
    k === "claude_md"
      ? `${API_BASE}/claude-md/${it.project_category || "generic"}/${it.slug}`
      : `${API_BASE}/skills/${it.slug}`;

  const fmtItem = (it, s) => {
    const lines = [
      `**${it.slug}**`,
      `  category : ${it.category || it.project_category || "—"}`,
      `  tier : ${it.tier}${it.price_usd != null ? ` · \$${it.price_usd}` : ""}`,
      `  ${s.kind} : ${s.value != null ? s.value.toFixed(1) : "—"}${s.kind === "elo" ? " (benched)" : s.kind === "prior" ? " (quality prior, not benched yet)" : ""}`,
      `  ★ ${it.stars ?? 0}`,
      `  ${detailPath(it)}`,
    ];
    return lines.join("\n");
  };

  return [
    `# Versuz battle : ${itemA.slug} vs ${itemB.slug}`,
    "",
    fmtItem(itemA, sA),
    "",
    fmtItem(itemB, sB),
    "",
    "---",
    "",
    `**Verdict :** ${verdict}`,
    "",
    `Install the winner : \`npx versuz install ${(sA.value ?? -Infinity) > (sB.value ?? -Infinity) ? itemA.slug : itemB.slug}\``,
  ].join("\n");
}

export async function startServer() {
  const server = new Server(
    { name: "versuz", version: "0.2.0" },
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
      else if (name === "versuz_battle") text = await handleBattle(args);
      else if (name === "versuz_submit") text = await handleSubmit(args);
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
