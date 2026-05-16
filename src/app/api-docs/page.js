import Link from "next/link";
import { PageHero } from "@/components/section";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";

export const metadata = {
  title: "API docs — Versuz",
  description: "Public JSON API v1 documentation for Versuz. Read skills + CLAUDE.md, submit your own, no signup for public endpoints.",
};

// Contenu 100% statique. ISR 1h — voir /about/page.js.
export const revalidate = 3600;

const BASE = "https://versuz.dev";

const ENDPOINTS = [
  {
    id: "list-skills",
    method: "GET",
    path: "/api/v1/skills",
    title: "List skills",
    desc: "Paginated list of indexed SKILL.md items. Default 50 per page, max 100.",
    params: [
      { name: "page", type: "int", default: "1", desc: "Page number, 1-indexed" },
      { name: "limit", type: "int", default: "50", desc: "Items per page (max 100)" },
      { name: "category", type: "enum", default: "—", desc: "document, sql, data, web, shell, code" },
      { name: "tier", type: "enum", default: "—", desc: "free, premium, featured" },
      { name: "min_verification", type: "int", default: "0", desc: "Min verification level (0-4)" },
      { name: "q", type: "string", default: "—", desc: "Search across name + slug + description" },
      { name: "sort", type: "enum", default: "prior", desc: "prior, stars, recent, name" },
    ],
    example: `curl '${BASE}/api/v1/skills?category=document&limit=10&sort=stars'`,
    response: `{
  "api_version": "v1",
  "kind": "skill",
  "page": 1,
  "limit": 10,
  "total": 487,
  "items": [
    {
      "slug": "pdf-generator",
      "name": "PDF Generator",
      "description": "Generate styled PDFs from markdown with a single command.",
      "category": "document",
      "tier": "free",
      "price_usd": null,
      "verification_level": 2,
      "stars": 1247,
      "forks": 89,
      "topics": ["pdf", "markdown"],
      "license": "MIT",
      "pushed_at": "2026-05-10T14:23:00Z",
      "github_url": "https://github.com/example/pdf-generator",
      "skill_type": "bundled",
      "prior": 1843.2
    }
  ]
}`,
  },
  {
    id: "get-skill",
    method: "GET",
    path: "/api/v1/skills/{slug}",
    title: "Get one skill",
    desc: "Full metadata of a single skill, including bench scores and judge axes when available.",
    params: [
      { name: "slug", type: "string", default: "—", desc: "Skill slug (path param)" },
    ],
    example: `curl '${BASE}/api/v1/skills/pdf-generator'`,
    response: `{
  "api_version": "v1",
  "kind": "skill",
  "item": {
    "slug": "pdf-generator",
    "name": "PDF Generator",
    "description": "...",
    "category": "document",
    "tier": "free",
    "verification_level": 2,
    "stars": 1247,
    "license": "MIT",
    "github_url": "https://github.com/example/pdf-generator",
    "bench_score": 78.4,
    "task_count": 5,
    "axes": {
      "instruction_following": 82.1,
      "correctness": 75.3,
      "completeness": 80.0,
      "usefulness": 79.5,
      "safety": 72.0
    }
  }
}`,
  },
  {
    id: "get-skill-content",
    method: "GET",
    path: "/api/v1/skills/{slug}/content",
    title: "Get raw SKILL.md content",
    desc: "Returns the raw markdown body of a skill. Free items are open. Premium items return 402 Payment Required with a buy_url.",
    params: [
      { name: "slug", type: "string", default: "—", desc: "Skill slug (path param)" },
    ],
    example: `curl '${BASE}/api/v1/skills/pdf-generator/content'`,
    response: `{
  "api_version": "v1",
  "kind": "skill",
  "slug": "pdf-generator",
  "name": "PDF Generator",
  "description": "...",
  "content": "---\\nname: pdf-generator\\n...\\n---\\n\\n# PDF Generator\\n\\n...",
  "bundle_files": [
    { "name": "scripts/render.py", "type": "file", "size": 4012 }
  ],
  "github_url": "https://github.com/example/pdf-generator"
}`,
    note: "Premium items return HTTP 402 with { error, slug, tier, price_usd, buy_url }.",
  },
  {
    id: "list-claude-md",
    method: "GET",
    path: "/api/v1/claude-md",
    title: "List CLAUDE.md",
    desc: "Paginated list of indexed CLAUDE.md items. Same param shape as /skills.",
    params: [
      { name: "page", type: "int", default: "1", desc: "Page number" },
      { name: "limit", type: "int", default: "50", desc: "Items per page (max 100)" },
      { name: "category", type: "enum", default: "—", desc: "nextjs, react, python-data, backend-api, mobile, devops, ml-training, generic" },
      { name: "tier", type: "enum", default: "—", desc: "free, premium, featured" },
      { name: "q", type: "string", default: "—", desc: "Search across slug + description" },
      { name: "sort", type: "enum", default: "stars", desc: "stars, recent, name" },
    ],
    example: `curl '${BASE}/api/v1/claude-md?category=nextjs&limit=5'`,
    response: `{
  "api_version": "v1",
  "kind": "claude_md",
  "page": 1,
  "limit": 5,
  "total": 312,
  "items": [ /* ... shape similar to skills, with project_category instead of category */ ]
}`,
  },
  {
    id: "get-claude-md",
    method: "GET",
    path: "/api/v1/claude-md/{slug}",
    title: "Get one CLAUDE.md",
    desc: "Full metadata of a single CLAUDE.md file.",
    params: [
      { name: "slug", type: "string", default: "—", desc: "CLAUDE.md slug" },
    ],
    example: `curl '${BASE}/api/v1/claude-md/owner-repo'`,
    response: `{ "api_version": "v1", "kind": "claude_md", "item": { /* ... */ } }`,
  },
  {
    id: "get-claude-md-content",
    method: "GET",
    path: "/api/v1/claude-md/{slug}/content",
    title: "Get raw CLAUDE.md content",
    desc: "Returns the raw markdown body. Same 402 behavior on premium items.",
    params: [
      { name: "slug", type: "string", default: "—", desc: "CLAUDE.md slug" },
    ],
    example: `curl '${BASE}/api/v1/claude-md/owner-repo/content'`,
    response: `{
  "api_version": "v1",
  "kind": "claude_md",
  "slug": "owner-repo",
  "description": "...",
  "project_category": "nextjs",
  "content": "# Project context\\n...",
  "github_url": "https://github.com/owner/repo"
}`,
  },
  {
    id: "auth-whoami",
    method: "POST",
    path: "/api/v1/auth/whoami",
    title: "Whoami (PAT verification)",
    desc: "Verify a GitHub Personal Access Token and return the authenticated user. Used by the CLI for login.",
    params: [
      { name: "token", type: "string", default: "—", desc: "GitHub PAT, in request body { token: 'ghp_...' }" },
    ],
    example: `curl -X POST '${BASE}/api/v1/auth/whoami' \\
  -H 'content-type: application/json' \\
  -d '{"token": "ghp_yourtoken"}'`,
    response: `{
  "ok": true,
  "github_user_id": 12345678,
  "login": "octocat",
  "name": "The Octocat"
}`,
    auth: "PAT in body. We hit GitHub's /user endpoint to verify, never store the raw token.",
  },
  {
    id: "submit",
    method: "POST",
    path: "/api/v1/submit",
    title: "Submit a SKILL.md or CLAUDE.md",
    desc: "Submit a public GitHub URL to the registry. Requires PAT auth + ownership of the repo (or org membership). Free tier only via API.",
    params: [
      { name: "token", type: "string", default: "—", desc: "GitHub PAT for auth + ownership check" },
      { name: "url", type: "string", default: "—", desc: "GitHub URL pointing to a SKILL.md or CLAUDE.md file" },
    ],
    example: `curl -X POST '${BASE}/api/v1/submit' \\
  -H 'content-type: application/json' \\
  -d '{
    "token": "ghp_yourtoken",
    "url": "https://github.com/you/your-repo/blob/main/SKILL.md"
  }'`,
    response: `{
  "ok": true,
  "kind": "skill",
  "slug": "your-skill",
  "action": "created",
  "url": "https://versuz.dev/skills/your-skill"
}`,
    auth: "GitHub PAT required. 8-layer anti-spam : auth verified, ownership re-checked, rate limit 5/h/user, 24h URL dedup, strict regex, 200 KB size cap, free tier only via API.",
    note: "Returns 401 (auth), 403 (ownership), 409 (duplicate), 413 (size), 429 (rate limit), 422 (invalid URL/content).",
  },
];

const RATE_LIMITS = [
  { endpoint: "GET /api/v1/*", limit: "Fair use", body: "No hard rate limit on read endpoints. Don't hammer (>10 req/s sustained will get blocked at the edge)." },
  { endpoint: "POST /api/v1/submit", limit: "5 per hour per GitHub user", body: "Tracked in cli_submissions table by github_user_id. Counts both success and rejected submissions." },
  { endpoint: "POST /api/v1/auth/whoami", limit: "Fair use", body: "Each call hits GitHub /user — be reasonable. Cache the result client-side after first verification." },
];

export default function ApiDocsPage() {
  return (
    <div>
      <PageHero
        eyebrow="API docs"
        title={
          <>
            JSON API <em style={{ color: "var(--accent)" }}>v1</em>.
          </>
        }
        subtitle="Browse the public registry programmatically. Read all skills + CLAUDE.md. Submit your own. PAT auth for writes, no signup for reads."
      />

      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
        }}
      >
        {/* Quick start */}
        <Reveal>
          <div
            style={{
              padding: 24,
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              marginBottom: 56,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
            }}
            className="vz-stack-mobile"
          >
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--fg-muted)",
                }}
              >
                Quick start
              </span>
              <h2
                style={{
                  margin: "8px 0 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                Try it in one line.
              </h2>
              <pre
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  background: "var(--ink)",
                  color: "var(--bone)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  lineHeight: 1.6,
                  overflow: "auto",
                }}
              >
{`$ curl '${BASE}/api/v1/skills?limit=3' | jq '.items[].name'`}
              </pre>
            </div>
            <div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--fg-muted)",
                }}
              >
                Auth (writes only)
              </span>
              <h2
                style={{
                  margin: "8px 0 12px",
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                }}
              >
                GitHub PAT.
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--fg-muted)",
                }}
              >
                Reads are public. Writes (submit) require a GitHub Personal
                Access Token sent in the request body. Versuz verifies it via
                GitHub&apos;s <code>/user</code> endpoint, never stores the
                raw token. Use the <code>public_repo</code> scope, no more.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Endpoints */}
        <Reveal>
          <h2
            style={{
              margin: "0 0 24px",
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 400,
              letterSpacing: "-0.02em",
            }}
          >
            Endpoints
          </h2>
        </Reveal>

        <Reveal>
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 56,
              paddingBottom: 24,
              borderBottom: "1px solid var(--rule)",
            }}
          >
            {ENDPOINTS.map((e) => (
              <a
                key={e.id}
                href={`#${e.id}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  padding: "6px 10px",
                  border: "1px solid var(--rule)",
                  color: "var(--fg-muted)",
                  textDecoration: "none",
                  background: "var(--bg)",
                }}
                className="vz-pill-btn"
              >
                <span style={{ color: e.method === "POST" ? "var(--accent)" : "var(--azure)" }}>
                  {e.method}
                </span>{" "}
                {e.path}
              </a>
            ))}
          </nav>
        </Reveal>

        <RevealStagger stagger={0.06} style={{ display: "flex", flexDirection: "column", gap: 80 }}>
          {ENDPOINTS.map((e) => (
            <RevealItem key={e.id}>
              <section id={e.id} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <header
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--rule-strong)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      padding: "4px 8px",
                      color: "var(--bg)",
                      background: e.method === "POST" ? "var(--accent)" : "var(--azure)",
                    }}
                  >
                    {e.method}
                  </span>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 18,
                      color: "var(--fg)",
                      fontWeight: 500,
                    }}
                  >
                    {e.path}
                  </code>
                  <h3
                    style={{
                      margin: 0,
                      marginLeft: "auto",
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 400,
                      color: "var(--fg-muted)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {e.title}
                  </h3>
                </header>

                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--fg)" }}>
                  {e.desc}
                </p>

                {e.auth && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "color-mix(in oklab, var(--accent) 6%, transparent)",
                      borderLeft: "2px solid var(--accent)",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--fg)",
                    }}
                  >
                    <strong style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)", display: "block", marginBottom: 4 }}>
                      Auth
                    </strong>
                    {e.auth}
                  </div>
                )}

                {e.params && e.params.length > 0 && (
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--fg-muted)",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Parameters
                    </span>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 13,
                          minWidth: 520,
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--rule)" }}>
                            <th style={thStyle}>Name</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Default</th>
                            <th style={thStyle}>Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.params.map((p) => (
                            <tr key={p.name} style={{ borderBottom: "1px solid var(--rule)" }}>
                              <td style={tdStyle}>
                                <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                                  {p.name}
                                </code>
                              </td>
                              <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>
                                {p.type}
                              </td>
                              <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-muted)" }}>
                                {p.default}
                              </td>
                              <td style={tdStyle}>{p.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--fg-muted)",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Example
                  </span>
                  <pre
                    style={{
                      margin: 0,
                      padding: "14px 16px",
                      background: "var(--ink)",
                      color: "var(--bone)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      lineHeight: 1.6,
                      overflow: "auto",
                      whiteSpace: "pre",
                    }}
                  >
                    {e.example}
                  </pre>
                </div>

                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--fg-muted)",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Response (200)
                  </span>
                  <pre
                    style={{
                      margin: 0,
                      padding: "14px 16px",
                      background: "var(--surface)",
                      color: "var(--fg)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      lineHeight: 1.6,
                      overflow: "auto",
                      border: "1px solid var(--rule)",
                    }}
                  >
                    {e.response}
                  </pre>
                </div>

                {e.note && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.6,
                      color: "var(--fg-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    {e.note}
                  </p>
                )}
              </section>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* Rate limits */}
        <Reveal>
          <section style={{ marginTop: 96 }}>
            <h2
              style={{
                margin: "0 0 24px",
                fontFamily: "var(--font-display)",
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: "-0.02em",
              }}
            >
              Rate limits
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {RATE_LIMITS.map((r) => (
                <div
                  key={r.endpoint}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1fr) auto 2fr",
                    gap: 24,
                    padding: "14px 0",
                    borderBottom: "1px solid var(--rule)",
                    alignItems: "baseline",
                  }}
                  className="vz-stack-mobile"
                >
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)" }}>
                    {r.endpoint}
                  </code>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      color: "var(--fg)",
                      padding: "2px 8px",
                      border: "1px solid var(--rule-strong)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.limit}
                  </span>
                  <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)" }}>
                    {r.body}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Footer notes */}
        <Reveal>
          <section
            style={{
              marginTop: 96,
              padding: 32,
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
            }}
            className="vz-stack-mobile"
          >
            <div>
              <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400 }}>
                Errors
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--fg-muted)" }}>
                Errors return JSON with <code>{`{ error: string }`}</code> and standard
                HTTP status codes. <code>402</code> for premium gating includes a{" "}
                <code>buy_url</code>. <code>429</code> for rate-limited submissions
                includes <code>retry_after</code>.
              </p>
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400 }}>
                CLI + MCP
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--fg-muted)" }}>
                Most use cases are easier via <code>npx versuz</code> (interactive CLI)
                or <code>claude mcp add versuz npx -y @versuz/mcp</code> (inline in
                Claude Code). See <Link href="/about#tools" className="vz-link">about</Link>.
              </p>
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400 }}>
                Stability
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--fg-muted)" }}>
                v1 is the only public API. Breaking changes go through a v2 path,
                announced 30 days in advance on this page + RSS feed at{" "}
                <Link href="/feed" className="vz-link">/feed</Link>.
              </p>
            </div>
            <div>
              <h3 style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400 }}>
                Issues / feedback
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--fg-muted)" }}>
                Report bugs on{" "}
                <a href="https://github.com/TomaTV/versuz/issues" target="_blank" rel="noreferrer" className="vz-link">
                  GitHub issues ↗
                </a>
                . API questions :{" "}
                <a href="mailto:contact@flukxstudio.fr" className="vz-link">contact@flukxstudio.fr</a>.
              </p>
            </div>
          </section>
        </Reveal>
      </section>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--fg-muted)",
  padding: "10px 12px 10px 0",
};

const tdStyle = {
  padding: "10px 12px 10px 0",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--fg)",
  verticalAlign: "top",
};
