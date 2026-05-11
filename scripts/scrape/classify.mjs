/**
 * Skill classifier — keyword-based, deterministic.
 *
 * V0 categories: document, sql, data, web, shell, code (matches CATEGORIES in
 * fixtures/seed.js). Returns the best match plus a confidence score [0,1].
 *
 * Rationale: an LLM-based classifier would be more accurate but adds cost,
 * latency, and non-determinism. For V0 the GitHub search query already
 * narrows the corpus; a keyword classifier is sufficient.
 *
 * v2 (mai 2026) : keyword lists élargies 3-4× après audit du corpus réel
 * (1700+ skills scraped, ~1200 en 'other'). Garde le tradeoff specificity vs
 * recall — keywords trop génériques ("function", "tool") gardés HORS scope
 * pour éviter le false-positive grand-bucket.
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
      // AI/Agent specific
      "claude code", "claude skill", "claude.md", "skill.md", "anthropic sdk",
      "mcp server", "model context protocol", "llm agent", "openai sdk",
      "openai api", "cursor ide", "copilot", "agent workflow",
      "tool calling", "function calling",
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
];

// Below this raw hit count, the classifier doesn't trust itself enough to
// pick one of the 6 buckets — falls back to 'other'. Items in 'other' still
// land in the marketplace, but aren't bench-rankable until we author tasks
// for that domain.
const MIN_HITS_FOR_BUCKET = 1;

export function classifySkill({ name = "", description = "", body = "", tools = [] }) {
  // Weight by location : name (×3) and description (×2) are user-curated
  // signals — they trump body keyword soup. Avoids false positives like
  // "this skill extracts SQL queries" landing in 'document' because it
  // mentions "extract" once in the body.
  const nameStr = String(name).toLowerCase();
  const descStr = String(description).toLowerCase();
  const bodyStr = (String(body) + " " + tools.join(" ")).toLowerCase();
  if (!nameStr.trim() && !descStr.trim() && !bodyStr.trim()) {
    return { id: "other", confidence: 0, hits: 0 };
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
    return { id: "other", confidence: 0, hits: 0 };
  }

  // crude confidence: top score normalised against runner-up, with floor 0.3
  const runnerUp = scores[1]?.score || 0;
  const denom = top.score + runnerUp;
  const confidence = Math.max(0.3, Math.min(1, top.score / Math.max(denom, 1)));

  return { id: top.id, confidence, hits: top.hits };
}
