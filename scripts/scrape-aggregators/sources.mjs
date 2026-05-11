/**
 * Curated aggregator sources for Claude Code skills + CLAUDE.md repos.
 *
 * These are awesome-* lists / community indexes maintained by humans, so the
 * yield is much lower than GitHub Code Search but the quality signal is much
 * higher (someone vouched for each entry). Use as a complement, not a
 * replacement.
 *
 * To add a source : push an entry below. Each source is just a raw markdown
 * URL ; the scraper extracts every `github.com/owner/repo` link it finds.
 *
 * Add only sources you trust — anything we extract gets fetched and upserted.
 */

export const SOURCES = [
  // === Claude Code (CLAUDE.md focus) ===
  {
    name: "hesreallyhim/awesome-claude-code",
    url: "https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/README.md",
    note: "Curated Claude Code hub — skills, agents, hooks, status lines, orchestrators",
  },
  {
    name: "jqueryscript/awesome-claude-code",
    url: "https://raw.githubusercontent.com/jqueryscript/awesome-claude-code/main/README.md",
    note: "Claude Code plugins, MCP servers, editor integrations",
  },
  {
    name: "jmanhype/awesome-claude-code",
    url: "https://raw.githubusercontent.com/jmanhype/awesome-claude-code/main/README.md",
    note: "Claude Code plugins, MCP servers, editor integrations",
  },

  // === Claude Skills (SKILL.md focus) ===
  {
    name: "anthropics/skills",
    url: "https://raw.githubusercontent.com/anthropics/skills/main/README.md",
    note: "Anthropic's official skills repo — reference SKILL.md files",
    kinds: ["skill"],
  },
  {
    name: "ComposioHQ/awesome-claude-skills",
    url: "https://raw.githubusercontent.com/ComposioHQ/awesome-claude-skills/main/README.md",
    note: "Curated Claude Skills + workflow tools",
    kinds: ["skill"],
  },
  {
    name: "BehiSecc/awesome-claude-skills",
    url: "https://raw.githubusercontent.com/BehiSecc/awesome-claude-skills/main/README.md",
    note: "65+ full-stack skills covering broad categories",
    kinds: ["skill"],
  },
  {
    name: "travisvn/awesome-claude-skills",
    url: "https://raw.githubusercontent.com/travisvn/awesome-claude-skills/main/README.md",
    note: "Claude Skills + tools for Claude Code customization",
    kinds: ["skill"],
  },

  // === Sub-agents ===
  {
    name: "VoltAgent/awesome-claude-code-subagents",
    url: "https://raw.githubusercontent.com/VoltAgent/awesome-claude-code-subagents/main/README.md",
    note: "100+ specialized Claude Code subagents",
    kinds: ["claude_md"],
  },

  // === Personal power-user setups ===
  {
    name: "dtsong/my-claude-setup",
    url: "https://raw.githubusercontent.com/dtsong/my-claude-setup/main/README.md",
    note: "Portable Claude Code setup with skills + agents + commands",
  },
  {
    name: "rohitg00/awesome-claude-code-toolkit",
    url: "https://raw.githubusercontent.com/rohitg00/awesome-claude-code-toolkit/main/README.md",
    note: "135 agents + 35 skills + 42 commands + 176+ plugins",
  },

  // === Adjacent ecosystem (MCP, Anthropic broadly) ===
  {
    name: "Omrigotlieb/awesome-anthropic",
    url: "https://raw.githubusercontent.com/Omrigotlieb/awesome-anthropic/main/README.md",
    note: "Broader Anthropic / Claude ecosystem index",
  },
  {
    name: "punkpeye/awesome-mcp-servers",
    url: "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
    note: "MCP servers — many cross-link Claude resources",
  },
  {
    name: "wong2/awesome-mcp-servers",
    url: "https://raw.githubusercontent.com/wong2/awesome-mcp-servers/main/README.md",
    note: "Original MCP servers list (older but big)",
  },

  // === Prompt library (lower yield but cheap to scan) ===
  {
    name: "langgptai/awesome-claude-prompts",
    url: "https://raw.githubusercontent.com/langgptai/awesome-claude-prompts/main/README.md",
    note: "Prompt library — yields some skill repos by reference",
  },
  {
    name: "yzfly/awesome-chatgpt-prompts-CN",
    url: "https://raw.githubusercontent.com/yzfly/LangGPT/main/README.md",
    note: "LangGPT — Chinese prompt structure, sometimes references Claude skills",
  },

  // === Additional MCP / Claude ecosystem aggregators ===
  {
    name: "appcypher/awesome-mcp-servers",
    url: "https://raw.githubusercontent.com/appcypher/awesome-mcp-servers/main/README.md",
    note: "Alternative MCP servers list",
  },
  {
    name: "modelcontextprotocol/servers",
    url: "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md",
    note: "Anthropic-maintained reference MCP servers",
  },
  {
    name: "raoufchebri/awesome-mcp",
    url: "https://raw.githubusercontent.com/raoufchebri/awesome-mcp/main/README.md",
    note: "Alternative MCP server / registry list — 200-700 useful links",
  },

  // === Cross-format rules (Cursor / Continue / Windsurf / Cline) ===
  {
    name: "continuedev/awesome-rules",
    url: "https://raw.githubusercontent.com/continuedev/awesome-rules/main/README.md",
    note: "Multi-assistant rules : Cursor / Continue / Windsurf — 500-2k entries",
  },
  {
    name: "PatrickJS/awesome-cursorrules",
    url: "https://raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/README.md",
    note: "Curated .cursorrules files by stack — 300-800 links",
  },
  {
    name: "SchneiderSam/awesome-windsurfrules",
    url: "https://raw.githubusercontent.com/SchneiderSam/awesome-windsurfrules/main/README.md",
    note: ".windsurfrules + global_rules.md examples — 100-300 links",
  },
  {
    name: "obviousworks/vibe-coding-ai-rules",
    url: "https://raw.githubusercontent.com/obviousworks/vibe-coding-ai-rules/main/README.md",
    note: "Cross-IDE coding rules (Cursor + Windsurf + Cline) — 50-150 files",
  },

  // === AGENTS.md open standard (Codex / cross-tool) ===
  {
    name: "tairov/awesome-agents.md",
    url: "https://raw.githubusercontent.com/tairov/awesome-agents.md/main/README.md",
    note: "AGENTS.md open standard examples + tooling — 100-400 entries",
  },
];

/**
 * GitHub topics to search for repository candidates. Repository search has a
 * MUCH higher rate limit than code search (30 RPM vs 10) and lets us discover
 * repos beyond awesome-* lists by their topic tags.
 *
 * Each topic returns up to 1000 repos sorted by stars desc — we then check
 * each for SKILL.md / CLAUDE.md at root via the same processCandidate path.
 *
 * Set GITHUB_TOPICS_MAX_PAGES env to override (default 3 pages × 100 = 300/topic).
 */
export const GITHUB_TOPICS = [
  // Claude / Anthropic native
  { topic: "claude-code", kinds: ["skill", "claude_md"] },
  { topic: "claude-skill", kinds: ["skill"] },
  { topic: "claude-skills", kinds: ["skill"] },
  { topic: "claude-md", kinds: ["claude_md"] },
  { topic: "claude-agent", kinds: ["skill", "claude_md"] },
  { topic: "claude-subagent", kinds: ["claude_md"] },
  { topic: "anthropic-claude", kinds: ["skill", "claude_md"] },

  // MCP ecosystem
  { topic: "mcp-server", kinds: ["skill", "claude_md"] },
  { topic: "model-context-protocol", kinds: ["skill", "claude_md"] },
  { topic: "mcp", kinds: ["skill", "claude_md"] },

  // Cross-IDE coding agents (likely to ship CLAUDE.md/AGENTS.md/rules)
  { topic: "cursor-rules", kinds: ["claude_md"] },
  { topic: "windsurf", kinds: ["claude_md"] },
  { topic: "continue-dev", kinds: ["claude_md"] },
  { topic: "coding-agent", kinds: ["skill", "claude_md"] },
  { topic: "ai-agents", kinds: ["skill", "claude_md"] },
  { topic: "agentic-coding", kinds: ["skill", "claude_md"] },
  { topic: "vibe-coding", kinds: ["skill", "claude_md"] },

  // Adjacent prompt/system-prompt ecosystem
  { topic: "prompt-engineering", kinds: ["skill"] },
  { topic: "prompt-library", kinds: ["skill"] },
  { topic: "system-prompt", kinds: ["skill"] },
  { topic: "llm-tools", kinds: ["skill", "claude_md"] },

  // Other IDE-rule ecosystems (often double as project context)
  { topic: "roo-code", kinds: ["claude_md"] },
  { topic: "cline", kinds: ["claude_md"] },
  { topic: "codex", kinds: ["skill", "claude_md"] },
];
