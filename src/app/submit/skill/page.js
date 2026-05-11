import Link from "next/link";
import { PageHero } from "@/components/section";
import { Reveal } from "@/components/motion/reveal";
import { SubmitForm } from "@/components/submit/submit-form";
import {
  submitSkillFromUrl,
  submitSkillFromContent,
} from "@/lib/submit/actions";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata = {
  title: "Submit a skill — Versuz",
};

export default async function SubmitSkillPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <PageHero
        eyebrow="Submit · Skill"
        title={
          <>
            Bring your <em style={{ color: "var(--accent)" }}>SKILL.md</em>.
          </>
        }
        subtitle="Two paths: paste a public GitHub URL (we scrape it), or paste the content directly. Either way the skill enters the registry as Free + Claimed (you authored it via your GitHub OAuth match)."
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
            What happens <em style={{ color: "var(--accent)" }}>next</em>?
          </h2>
          <ol
            style={{
              margin: "32px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {[
              {
                n: "01",
                color: "var(--azure)",
                title: "Indexed",
                body: "Your SKILL.md is parsed, classified, and added to the registry within 24h.",
              },
              {
                n: "02",
                color: "var(--accent)",
                title: "Claimed",
                body: "If you signed in via GitHub and the repo owner matches, you get verification level 1 immediately.",
              },
              {
                n: "03",
                color: "var(--sage)",
                title: "Verified+",
                body: "License + frontmatter checks → level 2. Manual Versuz review → level 3. Editor's pick → level 4.",
              },
              {
                n: "04",
                color: "var(--amber)",
                title: "Ranked",
                body: "Once the bench cycle includes your category, you get an Elo and a top-N badge if you make it.",
              },
            ].map((step) => (
              <li
                key={step.n}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 12,
                    height: 12,
                    background: step.color,
                    marginTop: 6,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    {step.n} · {step.title}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      lineHeight: 1.4,
                      letterSpacing: "-0.01em",
                      color: "var(--fg-muted)",
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
                Heads up — sign in with GitHub for automatic claim verification.{" "}
                <Link href="/login?next=/submit/skill" className="vz-link">
                  Sign in ↗
                </Link>
              </div>
            </Reveal>
          )}

          <Reveal delay={0.1}>
            <SubmitForm
              urlAction={submitSkillFromUrl}
              contentAction={submitSkillFromContent}
              contentLabel="SKILL.md content"
              contentPlaceholder={`---\nname: my-skill\ndescription: Extract X from Y\ntools: [read, bash]\n---\n\n# my-skill\n\nYou are an expert in...`}
            />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
