/**
 * Skill classifier — keyword-based, deterministic.
 *
 * V0 categories: document, sql, data, web, shell, code (matches CATEGORIES in
 * fixtures/seed.js).
 *
 * v2 (mai 2026) : keyword lists élargies 3-4× après audit du corpus réel
 * (1700+ skills scraped, ~1200 en 'other').
 *
 * v3 (mai 2026 — V1.5) : multi-catégorie + buckets agent-spécifiques.
 *   - classifySkill() retourne maintenant { id, confidence, hits, categories }
 *     où `categories` = array trié desc par score, contenant tous les buckets
 *     dont le score atteint >= 50% du leader (migration 0040 jsonb column).
 *   - Nouveaux buckets : claude-skill, codex, cursor-rule, windsurf-rule,
 *     antigravity, mcp-server, continue-rule, roo-code, cline.
 *
 * Rationale : un skill MCP peut aussi parser des PDFs. Avant : forcé dans
 * 'mcp-server' OU 'document', perdu dans l'autre. Maintenant : présent dans
 * les 2 filtres.
 */

// Keywords are matched against name + description + body, weighted by where
// they appear (name × 3, description × 2, body × 1). Keep keywords SPECIFIC
// — generic words like "extract" / "table" / "form" appear in every
// technical doc and false-positive everything into the matching bucket.
const RULES = [
  {
    id: "document",
    keywords: [
      // PDF / OCR
      "pdf", "ocr", "tesseract", "pdfplumber", "pdfminer", "pypdf", "pdfkit",
      "pdfjs", "mupdf", "poppler", "scanned",
      // Office formats
      "docx", "word document", "xlsx", "spreadsheet", "pptx", "presentation",
      "rtf", "odt",
      // Forms / structured docs
      "tax form", "receipt", "invoice", "fillable", "acroform", "form field",
      "fillable form", "form filling",
      // Markdown / LaTeX
      "markdown", "latex", "rst", "asciidoc", "mdx",
      // Academic / citation
      "citation", "bibtex", "research paper", "scholarly", "arxiv",
      "academic paper",
      // Extraction-specific
      "document extraction", "text extraction", "table extraction",
      "layout analysis", "document parsing", "extract from pdf",
    ],
    weight: 1,
  },
  {
    id: "sql",
    keywords: [
      // Engines
      "postgres", "postgresql", "mysql", "sqlite", "mariadb", "snowflake",
      "bigquery", "duckdb", "redshift", "clickhouse", "cockroachdb", "supabase",
      "planetscale", "neon", "turso",
      // Concepts
      "sql query", "ddl", "dml", "schema migration", "alter table",
      "create table", "select from", "join on", "where clause", "group by",
      "rls", "row level security", "constraint", "foreign key", "primary key",
      "index", "view materialized", "stored procedure", "trigger",
      "transaction", "isolation level", "cte", "common table expression",
      "window function",
      // Tools
      "pg_", "psql", "pgcli", "drizzle", "prisma", "sqlalchemy", "knex",
      "sequelize", "typeorm", "kysely",
    ],
    weight: 1,
  },
  {
    id: "data",
    keywords: [
      // Formats
      "csv", "tsv", "parquet", "avro", "orc", "json lines", "jsonl",
      "ndjson", "json schema", "yaml", "toml",
      // Frameworks
      "pandas", "polars", "dataframe", "numpy", "scipy", "duckdb",
      "spark", "pyspark", "dask",
      // Pipeline / ETL
      "etl", "elt", "data pipeline", "dbt", "airflow", "prefect", "dagster",
      "luigi", "kafka", "ingestion", "data lake", "data warehouse",
      "transformation",
      // Notebooks / analysis
      "jupyter", "notebook", "ipynb", "data analysis", "exploratory data",
      "eda", "data viz", "matplotlib", "seaborn", "plotly",
      // ML data
      "feature engineering", "tabular data", "schema infer", "data quality",
      "data cleaning", "data validation",
      // Tools
      "jq ", "yq ", "miller",
    ],
    weight: 0.95,
  },
  {
    id: "web",
    keywords: [
      // Scraping
      "scrape", "scraper", "crawl", "crawler", "spider", "web scraping",
      "scrapy", "beautifulsoup", "cheerio",
      // Browser automation
      "playwright", "puppeteer", "selenium", "headless browser", "chromium",
      "browserless", "browser automation",
      // HTML / DOM
      "html parsing", "dom traversal", "selector", "css selector", "xpath",
      "querySelector",
      // HTTP / API consumption
      "http request", "fetch api", "rest api", "graphql query", "openapi",
      "swagger", "axios", "node-fetch", "ky",
      // Web standards
      "rss", "atom feed", "sitemap", "robots.txt", "web archive",
      "wayback machine",
    ],
    weight: 1,
  },
  {
    id: "shell",
    keywords: [
      // Shells
      "bash script", "zsh", "fish shell", "powershell", "pwsh",
      "command line", "shell command",
      // Common tools
      "ripgrep", "grep", "awk", "sed", "tmux", "fzf", "fd find", "bat ",
      "exa ", "lsd ", "starship",
      // Git tooling
      "git log", "git rebase", "git bisect", "git worktree",
      "conventional commit", "changelog", "semantic version", "gh cli",
      "git hook", "pre-commit",
      // System / shell automation
      "cron job", "systemd", "launchd", "shell automation", "make file",
      "dotfiles",
      // Cli wrappers
      "cli wrap", "command wrapper", "shell completion", "zsh plugin",
    ],
    weight: 0.95,
  },
  {
    id: "code",
    keywords: [
      // Code workflow
      "code review", "refactor", "lint", "linter", "format", "prettier",
      "eslint", "rome", "biome", "ruff", "black formatter", "gofmt",
      // Testing
      "test generation", "unit test", "integration test", "jest", "vitest",
      "pytest", "mocha", "jasmine", "cypress", "playwright test",
      "test coverage", "tdd",
      // Languages
      "typescript", "javascript", "python", "rust", "golang", "ruby", "java ",
      "kotlin", "swift", "csharp", "scala", "elixir", "erlang", "ocaml",
      "haskell",
      // Frontend frameworks
      "react component", "vue component", "svelte", "angular", "next.js",
      "nextjs", "nuxt", "remix", "astro", "solidjs", "qwik",
      // Backend frameworks
      "fastapi", "django", "flask", "express", "nest.js", "rails",
      "spring boot", "gin gonic", "actix",
      // AST / Compilers
      "ast manipulation", "abstract syntax tree", "babel plugin", "tsc",
      "swc transform", "treesitter",
      // Common dev infra
      "stripe webhook", "supabase rls", "auth0", "clerk", "next-auth",
      "websocket", "graphql server", "trpc", "rest endpoint",
      // SDK/Library work
      "library author", "sdk wrapper", "npm package", "publish to npm",
    ],
    weight: 0.85,
  },
  // ─────────── V1.5 — agent-specific buckets ───────────
  {
    id: "claude-skill",
    keywords: [
      "claude code", "claude skill", "skill.md", "anthropic sdk",
      "claude desktop", "anthropic api", "claude opus", "claude sonnet",
      "claude haiku", "claude agent", "claude artifact",
    ],
    weight: 1,
  },
  {
    id: "codex",
    keywords: [
      "codex cli", "openai codex", "agents.md", "agent.md",
      "codex agent", "openai agent",
    ],
    weight: 1,
  },
  {
    id: "cursor-rule",
    keywords: [
      ".cursorrules", "cursor rules", ".cursor/rules", "cursor ide",
      "cursor agent", "cursor.so",
    ],
    weight: 1,
  },
  {
    id: "windsurf-rule",
    keywords: [
      ".windsurfrules", "windsurf rules", "windsurf ide", "codeium",
    ],
    weight: 1,
  },
  {
    id: "antigravity",
    keywords: [
      "antigravity", "google antigravity", "antigravity agent",
    ],
    weight: 1,
  },
  {
    id: "mcp-server",
    keywords: [
      "mcp server", "model context protocol", "mcp client",
      "mcp tool", "mcp resource", "mcp protocol", "@modelcontextprotocol",
      "mcp.json", "claude_desktop_config",
    ],
    weight: 1,
  },
  {
    id: "continue-rule",
    keywords: [
      "continue.dev", "continue rules", ".continue/rules", "continue agent",
    ],
    weight: 1,
  },
  {
    id: "roo-code",
    keywords: [
      "roo code", "roo-code", "roocode",
    ],
    weight: 1,
  },
  {
    id: "cline",
    keywords: [
      "cline ", "claude dev", "cline agent",
    ],
    weight: 1,
  },
  // ─────────── V1.5+ — broader content buckets (catch the long-tail of
  // "other" items that lost their body signal post-Storage-migration).
  {
    id: "writing",
    keywords: [
      "copywriting", "blog post", "article", "newsletter", "email draft",
      "ghostwriter", "ghostwriting", "editorial", "proofread", "prose",
      "content marketing", "press release", "case study", "white paper",
      "thought leadership", "linkedin post", "twitter thread", "x thread",
      "headline", "subject line", "cold email", "outreach email",
      "sales copy", "ad copy", "landing copy", "marketing copy",
      "tone of voice", "brand voice", "style guide",
    ],
    weight: 1,
  },
  {
    id: "design",
    keywords: [
      "figma", "ui design", "ux design", "ux research", "user interface",
      "user experience", "design system", "wireframe", "mockup", "prototype",
      "interaction design", "visual design", "graphic design",
      "accessibility", "wcag", "aria-", "color contrast", "responsive design",
      "tailwind", "shadcn", "radix", "design token", "color palette",
      "typography", "iconography", "design critique",
    ],
    weight: 1,
  },
  {
    id: "marketing",
    keywords: [
      "seo", "search engine optimization", "google analytics", "google tag",
      "ga4", "tag manager", "campaign", "growth hacking", "growth marketing",
      "google ads", "facebook ads", "meta ads", "linkedin ads", "tiktok ads",
      "ppc", "conversion rate", "cro ", "a/b test", "ab test",
      "newsletter", "email campaign", "drip campaign", "lead nurture",
      "lead magnet", "lead gen", "social media manager", "social media post",
      "content calendar", "buyer persona", "go-to-market", "gtm strategy",
      "competitive analysis", "market research", "brand positioning",
    ],
    weight: 1,
  },
  {
    id: "automation",
    keywords: [
      "n8n", "zapier", "make.com", "integromat", "ifttt",
      "workflow automation", "automation workflow", "process automation",
      "ci/cd", "github actions", "gitlab ci", "circleci", "jenkins",
      "scheduled task", "cron job", "scheduler", "task queue",
      "background job", "webhook handler", "event-driven",
      "rpa ", "robotic process automation",
    ],
    weight: 1,
  },
  {
    id: "research",
    keywords: [
      "research", "research paper", "literature review", "systematic review",
      "meta-analysis", "scientific paper", "arxiv", "pubmed", "doi:",
      "citation", "bibliography", "bibtex", "scholarly", "academic paper",
      "peer review", "preprint", "thesis", "dissertation",
      "summarize paper", "extract findings", "research synthesis",
      "experimental design", "hypothesis test", "scientific method",
    ],
    weight: 1,
  },
  // ─────────── V1.5++ — service/platform wrappers (catches a huge chunk
  // of "other" that wraps third-party APIs and CLIs).
  {
    id: "api-integration",
    keywords: [
      // Productivity
      "notion api", "notion cli", "notion page",
      "airtable", "monday.com", "asana", "trello", "linear",
      "jira", "confluence", "atlassian",
      // Office
      "google workspace", "gmail api", "google calendar", "google drive",
      "google sheets", "google docs", "google contacts",
      "office 365", "outlook api", "onedrive",
      // CRM / Sales
      "hubspot", "salesforce", "pipedrive", "intercom", "zendesk",
      // Devtools APIs
      "github api", "gh cli", "gitlab api", "bitbucket api",
      "1password cli", "op cli", "lastpass cli",
      // Payments
      "stripe api", "paypal api", "shopify",
      // Generic
      "api client", "api wrapper", "sdk wrapper", "cli wrapper",
      "rest client", "service wrapper",
      // Cloud Storage / docs
      "dropbox", "icloud", "iCloud Drive",
    ],
    weight: 1,
  },
  {
    id: "macos",
    keywords: [
      "macos ", "mac os", "applescript", "osascript", "jxa",
      "apple notes", "bear notes", "bear app", "things 3", "things.app",
      "fantastical", "drafts.app", "obsidian.app",
      "shortcuts.app", "keyboard maestro", "raycast", "alfred",
      "automator", "hammerspoon",
      "iterm", "terminal.app", "finder", "spotlight",
      "xcode", "swift package", "swift cli",
      "homebrew", "brew install",
      "mac app", "iphone", "ipad", "ios shortcut",
    ],
    weight: 1,
  },
  {
    id: "communication",
    keywords: [
      // Email
      "imap", "smtp", "mailbox", "email client", "email automation",
      "compose email", "send email", "email reply", "email forward",
      "mailto:", "newsletter platform",
      // Chat / messaging
      "slack api", "slack bot", "discord bot", "discord api",
      "telegram bot", "telegram api",
      "whatsapp", "signal messenger", "sms gateway", "imessage", "messages.app",
      "chat bot", "conversational ai", "dm message",
      "twilio", "sendgrid",
      // Voice
      "voice call", "phone call", "voice agent",
    ],
    weight: 1,
  },
  {
    id: "media",
    keywords: [
      // Audio
      "audio transcription", "speech to text", "stt", "speech recognition",
      "whisper", "openai whisper", "sherpa-onnx",
      "text to speech", "tts", "voice synthesis", "voice clone",
      "audio analysis", "spectrogram", "music generation", "midi",
      "sound effect", "audio editing", "audacity",
      // Video
      "ffmpeg", "video encoding", "video editing", "video transcoding",
      "video downloader", "yt-dlp", "youtube-dl",
      "screen recording", "obs studio",
      // Image
      "imagemagick", "image processing", "image generation", "stable diffusion",
      "midjourney", "dall-e", "image editor", "photo edit",
    ],
    weight: 1,
  },
  {
    id: "testing",
    keywords: [
      "end-to-end test", "e2e test", "integration test",
      "regression test", "smoke test", "snapshot test",
      "unit test", "test coverage", "code coverage",
      "playwright", "cypress", "selenium", "puppeteer", "webdriver",
      "vitest", "jest", "pytest", "rspec", "mocha", "chai",
      "test runner", "test harness", "mock library",
      "fixture", "test fixture", "factory bot",
      "qa testing", "quality assurance", "test plan",
      "ci test", "github actions test",
    ],
    weight: 1,
  },
  {
    id: "devops",
    keywords: [
      // Infra
      "ssh ", "firewall", "ufw", "fail2ban", "iptables",
      "nginx", "apache httpd", "caddy server", "traefik",
      "docker compose", "dockerfile", "kubernetes", "k8s",
      "helm chart", "kustomize",
      // IaC
      "terraform", "ansible", "puppet", "chef ", "pulumi",
      // Cloud
      "aws cli", "ec2", "s3 bucket", "lambda function",
      "gcp ", "google cloud", "cloud run", "cloud functions",
      "azure ", "hetzner cloud", "digitalocean", "vultr",
      "fly.io", "vercel deploy", "render.com", "netlify deploy",
      "railway",
      // Observability
      "prometheus", "grafana", "datadog", "sentry", "loki",
      "monitoring", "alerting", "observability", "tracing",
      "log aggregation", "metrics dashboard",
      // Ops
      "backup automation", "disaster recovery", "incident response",
      "host hardening", "host audit", "vulnerability scan",
    ],
    weight: 1,
  },
];

// Below this raw hit count, the classifier doesn't trust itself enough to
// pick one of the 6 buckets — falls back to 'other'. Items in 'other' still
// land in the marketplace, but aren't bench-rankable until we author tasks
// for that domain.
const MIN_HITS_FOR_BUCKET = 1;

// Bucket secondaire inclus dans `categories` array si son score atteint au
// moins MULTI_CAT_THRESHOLD × score du leader.
const MULTI_CAT_THRESHOLD = 0.5;

export function classifySkill({ name = "", description = "", body = "", tools = [] }) {
  // Weight by location : name (×3) and description (×2) are user-curated
  // signals — they trump body keyword soup. Avoids false positives like
  // "this skill extracts SQL queries" landing in 'document' because it
  // mentions "extract" once in the body.
  const nameStr = String(name).toLowerCase();
  const descStr = String(description).toLowerCase();
  const bodyStr = (String(body) + " " + tools.join(" ")).toLowerCase();
  if (!nameStr.trim() && !descStr.trim() && !bodyStr.trim()) {
    return { id: "other", confidence: 0, hits: 0, categories: ["other"] };
  }

  const scores = RULES.map((rule) => {
    let hits = 0;
    let weightedScore = 0;
    for (const kw of rule.keywords) {
      if (nameStr.includes(kw)) { hits += 1; weightedScore += 3; }
      if (descStr.includes(kw)) { hits += 1; weightedScore += 2; }
      if (bodyStr.includes(kw)) { hits += 1; weightedScore += 1; }
    }
    return { id: rule.id, score: weightedScore * rule.weight, hits };
  });

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  // No keyword match at all → real "other" (marketing, design, finance, etc.)
  if (!top || top.hits < MIN_HITS_FOR_BUCKET) {
    return { id: "other", confidence: 0, hits: 0, categories: ["other"] };
  }

  // crude confidence: top score normalised against runner-up, with floor 0.3
  const runnerUp = scores[1]?.score || 0;
  const denom = top.score + runnerUp;
  const confidence = Math.max(0.3, Math.min(1, top.score / Math.max(denom, 1)));

  // Multi-cat : tous les buckets >= threshold × top score (et hits >= MIN_HITS).
  const cutoff = top.score * MULTI_CAT_THRESHOLD;
  const categories = scores
    .filter((s) => s.score >= cutoff && s.hits >= MIN_HITS_FOR_BUCKET)
    .map((s) => s.id);

  return { id: top.id, confidence, hits: top.hits, categories };
}
