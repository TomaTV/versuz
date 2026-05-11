import Link from "next/link";
import { PageHero } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { SubmitForm } from "@/components/submit/submit-form";
import {
  submitClaudeMdFromUrl,
  submitClaudeMdFromContent,
} from "@/lib/submit/actions";
import { getCurrentUser } from "@/lib/auth/server";
import { getProjectCategories } from "@/lib/queries/rankings";

export const metadata = {
  title: "Submit a CLAUDE.md — Versuz",
};

export default async function SubmitClaudeMdPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getProjectCategories(),
  ]);

  return (
    <div>
      <PageHero
        eyebrow="Submit · CLAUDE.md"
        title={
          <>
            Bring your <em style={{ color: "var(--accent)" }}>CLAUDE.md</em>.
          </>
        }
        subtitle="Drop your project context file. We classify it by project type (Next.js, Python data, backend API…) and rank it by how much it actually improves agent quality on real coding tasks for that type."
      />

      <section
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px clamp(16px, 4.5vw, 64px) clamp(80px, 12vw, 160px)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          gap: "clamp(32px, 5vw, 64px)",
          alignItems: "flex-start",
        }}
        className="vz-auth-grid"
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 4vw, 64px)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "var(--fg)",
            }}
          >
            How we <em style={{ color: "var(--accent)" }}>judge</em> a CLAUDE.md
          </h2>
          <p
            style={{
              margin: "32px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 20,
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              color: "var(--fg-muted)",
            }}
          >
            Same project, two runs of an agent: one with your CLAUDE.md mounted, one without.
            The bench engine measures the <em style={{ color: "var(--accent)" }}>uplift</em> in
            output quality. A CLAUDE.md that&apos;s clear, project-specific, and tightly scoped
            beats a generic one every time.
          </p>
          <p
            style={{
              margin: "16px 0 0",
              fontFamily: "var(--font-display)",
              fontSize: 18,
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              color: "var(--fg-muted)",
            }}
          >
            Tip: don&apos;t paste 800 lines of docs. The best CLAUDE.md files are 200-500 words
            of crisp project rules.
          </p>
        </div>

        <div>
          {!user && (
            <Reveal>
              <div
                style={{
                  marginBottom: 24,
                  padding: "16px 18px",
                  border: "1px solid var(--rule-strong)",
                  background: "var(--surface)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--fg)",
                  lineHeight: 1.5,
                }}
              >
                Heads up — sign in with GitHub to auto-claim a CLAUDE.md from your repo.{" "}
                <Link href="/login?next=/submit/claude-md" className="vz-link">
                  Sign in ↗
                </Link>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.1}>
            <SubmitForm
              urlAction={submitClaudeMdFromUrl}
              contentAction={submitClaudeMdFromContent}
              contentLabel="CLAUDE.md content"
              contentPlaceholder={`# CLAUDE.md\n\nThis project uses Next.js 16 (App Router), TypeScript strict, and Tailwind v4...`}
              extraField={
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    Project type
                  </span>
                  <select
                    name="project_category"
                    defaultValue="generic"
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--rule)",
                      background: "var(--bg)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      color: "var(--fg)",
                      outline: "none",
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              }
            />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
