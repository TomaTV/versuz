import Link from "next/link";
import { PageHero, Section, SectionHeader } from "@/components/section";
import {
  getRankableCategories,
  getProjectCategories,
} from "@/lib/queries/rankings";

export const metadata = {
  title: "Feeds — Versuz",
  description:
    "RSS feeds for the Versuz registry. Subscribe to skill or CLAUDE.md updates per category — fresh items land in your reader as soon as they hit the index.",
};

export const dynamic = "force-dynamic"; // voir /about/page.js

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

export default async function FeedIndex() {
  const [skillCats, claudeMdCats] = await Promise.all([
    getRankableCategories(),
    getProjectCategories(),
  ]);

  return (
    <div>
      <PageHero
        eyebrow="Feeds"
        title={
          <>
            Subscribe to <em style={{ color: "var(--accent)" }}>fresh data</em>.
          </>
        }
        subtitle="Every SKILL.md and CLAUDE.md indexed by Versuz lands in these RSS feeds the moment it's scraped. Subscribe in your RSS reader — Feedly, NetNewsWire, Inoreader, miniflux, etc."
      />

      <section
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(40px, 6vw, 64px)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
        }}
        className="vz-history-grid"
      >
        <FeedColumn
          title="Skills"
          color="var(--azure)"
          baseFeed="/feed/skills"
          categories={skillCats}
        />
        <FeedColumn
          title="CLAUDE.md"
          color="var(--sage)"
          baseFeed="/feed/claude-md"
          categories={claudeMdCats}
        />
      </section>

      <Section eyebrow="How to subscribe" markerColor="var(--accent)" paddingY={64}>
        <SectionHeader
          title={
            <>
              Three ways in.
            </>
          }
          subtitle="Most modern browsers no longer have a built-in RSS reader, but any reader app handles these feeds out of the box. The feed URLs above are valid RSS 2.0."
        />
        <ol
          style={{
            marginTop: 32,
            paddingLeft: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--fg)",
            lineHeight: 1.6,
            letterSpacing: "0.02em",
          }}
        >
          <li>
            <strong>Reader apps</strong> — paste the URL into Feedly, NetNewsWire,
            Inoreader, miniflux, FreshRSS, etc.
          </li>
          <li>
            <strong>Email digest</strong> — services like Kill The Newsletter or
            Feedrabbit can convert any RSS feed into emails.
          </li>
          <li>
            <strong>Auto-discovery</strong> — every Versuz page advertises both feeds
            via{" "}
            <code style={{ background: "var(--surface)", padding: "1px 6px" }}>
              &lt;link rel=&quot;alternate&quot;&gt;
            </code>
            , so reader extensions pick them up automatically.
          </li>
        </ol>

        <div
          style={{
            marginTop: 40,
            padding: "16px 20px",
            border: "1px solid var(--rule)",
            background: "var(--surface)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}
        >
          Prefer a structured firehose? The same data is available as JSON via{" "}
          <a href="/api/v1/skills" target="_blank" rel="noreferrer" className="vz-link">
            /api/v1/skills
          </a>{" "}
          and{" "}
          <a href="/api/v1/claude-md" target="_blank" rel="noreferrer" className="vz-link">
            /api/v1/claude-md
          </a>
          . Pagination, filtering, and sort included.
        </div>
      </Section>
    </div>
  );
}

function FeedColumn({ title, color, baseFeed, categories }) {
  const fullUrl = `${BASE}${baseFeed}`;
  const filtered = categories.filter((c) => c.id !== "all");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          aria-hidden
          style={{ width: 12, height: 12, background: color, display: "inline-block" }}
        />
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--fg)",
            lineHeight: 1,
          }}
        >
          {title}
        </h2>
      </div>

      <FeedRow href={baseFeed} url={fullUrl} label="all categories" />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          Per category
        </span>
        {filtered.map((c) => {
          const href = `${baseFeed}?category=${encodeURIComponent(c.id)}`;
          return (
            <FeedRow
              key={c.id}
              href={href}
              url={`${BASE}${href}`}
              label={`${c.label} · ${c.count}`}
              size="sm"
            />
          );
        })}
      </div>
    </div>
  );
}

function FeedRow({ href, url, label, size = "md" }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 12,
        alignItems: "center",
        padding: size === "sm" ? "8px 12px" : "12px 16px",
        border: "1px solid var(--rule)",
        background: "var(--bg)",
      }}
    >
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={url}
        aria-label={`RSS feed · ${label}`}
        style={{
          width: size === "sm" ? 28 : 36,
          height: size === "sm" ? 28 : 36,
          background: "var(--accent)",
          color: "var(--bg)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <RssIcon size={size === "sm" ? 12 : 16} />
      </a>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: size === "sm" ? 14 : 18,
            color: "var(--fg)",
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </span>
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--fg-muted)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {url}
        </code>
      </div>
    </div>
  );
}

function RssIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}
