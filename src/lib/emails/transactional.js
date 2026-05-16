import { brandedEmail } from "./template";
import { unsubLink } from "./unsubscribe-token";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

export function welcomeSubscribeEmail({ email } = {}) {
  return {
    subject: "You're in — Versuz weekly digest",
    html: brandedEmail({
      title: `You're <em style="color:#c2410c;font-style:italic">in</em>.`,
      preheader: "Top-ranked SKILL.md and CLAUDE.md, every Friday.",
      body: `
        <p style="margin:0 0 16px">Thanks for subscribing.</p>
        <p style="margin:0 0 16px">Every Friday we send a short digest — the top-ranked SKILL.md and CLAUDE.md files of the week, plus what shipped on Versuz.</p>
        <p style="margin:0 0 16px">Nothing else. No spam, no upsells.</p>
        <p style="margin:0;color:#6b6557;font-size:14px">If this was a mistake, you can unsubscribe in one click via the link at the bottom of this email.</p>
      `,
      cta: { label: "Browse the marketplace", href: `${SITE}/marketplace` },
      unsubscribeUrl: email ? unsubLink(SITE, email) : null,
    }),
  };
}

export function welcomeSignupEmail({ githubLogin }) {
  return {
    subject: "Welcome to Versuz",
    html: brandedEmail({
      title: `Welcome, <em style="color:#c2410c;font-style:italic">${githubLogin || "friend"}</em>.`,
      preheader: "Your account is live. Here's what to do next.",
      body: `
        <p style="margin:0 0 16px">You're now part of the open benchmark for AI agent skills.</p>
        <p style="margin:0 0 16px"><strong>What you can do now:</strong></p>
        <ul style="margin:0 0 16px;padding-left:20px;line-height:1.8">
          <li>Browse 100,000+ ranked skills at <a href="${SITE}/marketplace" style="color:#c2410c">/marketplace</a></li>
          <li>Install instantly: <code style="background:#ece7dd;padding:2px 6px;font-family:'SF Mono',monospace;font-size:13px">npx versuz install &lt;slug&gt;</code></li>
          <li>Submit your own SKILL.md or CLAUDE.md at <a href="${SITE}/submit" style="color:#c2410c">/submit</a> — free, or set a price for premium (70% to you, 30% to Versuz)</li>
          <li>Add the MCP server so Claude Code discovers skills automatically: <code style="background:#ece7dd;padding:2px 6px;font-family:'SF Mono',monospace;font-size:13px">claude mcp add versuz npx -y @versuz/mcp</code></li>
        </ul>
        <p style="margin:0;color:#6b6557;font-size:14px">Questions? Hit reply — it goes to a real human.</p>
      `,
      cta: { label: "Explore Versuz", href: `${SITE}/marketplace` },
    }),
  };
}

export function submitConfirmationEmail({ kind, slug, name }) {
  const kindLabel = kind === "claude_md" ? "CLAUDE.md" : "SKILL.md";
  const url = kind === "claude_md"
    ? `${SITE}/claude-md/${slug}`
    : `${SITE}/skills/${slug}`;
  return {
    subject: `Your ${kindLabel} is live on Versuz`,
    html: brandedEmail({
      title: `Your ${kindLabel} <em style="color:#c2410c;font-style:italic">is live</em>.`,
      preheader: `${name} — submission confirmed`,
      body: `
        <p style="margin:0 0 16px">We received your submission and it's now indexed on Versuz.</p>
        <p style="margin:0 0 16px"><strong>Submitted:</strong> ${name}</p>
        <p style="margin:0 0 16px"><strong>Slug:</strong> <code style="background:#ece7dd;padding:2px 6px;font-family:'SF Mono',monospace;font-size:13px">${slug}</code></p>
        <p style="margin:0 0 16px">Next steps:</p>
        <ul style="margin:0 0 16px;padding-left:20px;line-height:1.8">
          <li>Our quality judge will score it within 4 hours (5-axis rubric)</li>
          <li>If accepted, it enters the bench rotation — Elo ranking starts within 24h</li>
          <li>You can track its score live at the URL below</li>
        </ul>
        <p style="margin:0;color:#6b6557;font-size:14px">Need to edit something? Reply with the slug and the change.</p>
      `,
      cta: { label: "See it live", href: url },
    }),
  };
}

export function reengagementEmail({ githubLogin, daysInactive, email }) {
  return {
    subject: "Versuz · still building with AI agents?",
    html: brandedEmail({
      title: `Anything <em style="color:#c2410c;font-style:italic">new</em> for you?`,
      preheader: `It's been a while — here's what shipped on Versuz`,
      body: `
        <p style="margin:0 0 16px">Hey ${githubLogin || "there"} — you signed up to Versuz ${daysInactive ? `~${daysInactive} days ago` : "a while back"} and haven't been back since.</p>
        <p style="margin:0 0 16px">Quick refresher on what's there now:</p>
        <ul style="margin:0 0 16px;padding-left:20px;line-height:1.8">
          <li>100,000+ ranked SKILL.md and CLAUDE.md files</li>
          <li>Daily bench cycles scoring new submissions</li>
          <li>Free CLI: <code style="background:#ece7dd;padding:2px 6px;font-family:'SF Mono',monospace;font-size:13px">npx versuz install &lt;slug&gt;</code></li>
          <li>MCP server: <code style="background:#ece7dd;padding:2px 6px;font-family:'SF Mono',monospace;font-size:13px">claude mcp add versuz npx -y @versuz/mcp</code></li>
        </ul>
        <p style="margin:0 0 16px;color:#6b6557;font-size:14px">Got feedback? Reply to this email — every message reaches a real human.</p>
        <p style="margin:0;color:#6b6557;font-size:13px">Not interested anymore? <a href="${SITE}/profile/settings" style="color:#6b6557">unsubscribe from re-engagement here</a>.</p>
      `,
      cta: { label: "See what's new", href: `${SITE}/marketplace?sort=recent` },
      unsubscribeUrl: email ? unsubLink(SITE, email) : null,
    }),
  };
}

/**
 * Weekly digest — sent by scripts/social/send-weekly-digest.mjs every
 * Friday-ish. Surfaces recent achievements + upsets + freshly indexed
 * high-quality items + featured picks. Keeps subscribers engaged without
 * any manual editorial work.
 *
 * Args :
 *   weekLabel        — "May 12 → May 18" string for the header
 *   achievements[]   — { type, name, href, category, days? } recent unlocks
 *   upsets[]         — { name, href, category, currentRank, prevRank, delta }
 *   featured[]       — { name, href, description, priceUsd } Versuz Featured
 *   freshHighQuality[] — { name, href, category, qualityScore } newly-indexed
 *   email            — recipient (for List-Unsubscribe header)
 */
export function weeklyDigestEmail({
  weekLabel,
  achievements = [],
  upsets = [],
  featured = [],
  freshHighQuality = [],
  email,
}) {
  const has = {
    achievements: achievements.length > 0,
    upsets: upsets.length > 0,
    featured: featured.length > 0,
    fresh: freshHighQuality.length > 0,
  };

  const achievementMeta = {
    triple_crown: { icon: "♛", color: "#d69e2e", label: "Triple Crown" },
    category_winner: { icon: "★", color: "#3f7d4f", label: "Category winner" },
    first_blood: { icon: "◆", color: "#2a5fa8", label: "First blood" },
    streak_milestone: { icon: "🔥", color: "#c2410c", label: "Streak milestone" },
  };

  const achievementsHtml = has.achievements
    ? `
      <h2 style="margin:24px 0 12px;font-family:'Georgia',serif;font-size:22px;letter-spacing:-0.01em;color:#14120e">
        <em style="color:#c2410c">Unlocked this week</em>
      </h2>
      <ul style="list-style:none;padding:0;margin:0 0 16px">
        ${achievements
          .slice(0, 6)
          .map((a) => {
            const m = achievementMeta[a.type] || { icon: "◇", color: "#6b6557", label: a.type };
            const sub = a.type === "streak_milestone" && a.days
              ? `${a.days}-day streak`
              : a.category
                ? `Category : ${a.category}`
                : "";
            return `
              <li style="padding:10px 12px;margin-bottom:6px;border-left:3px solid ${m.color};background:#ece7dd">
                <span style="font-family:'SF Mono',Menlo,monospace;font-size:10px;color:${m.color};letter-spacing:0.16em;text-transform:uppercase">${m.icon} ${m.label}</span><br>
                <a href="${SITE}${a.href}" style="color:#14120e;text-decoration:none;font-size:16px;font-weight:500">${escapeHtml(a.name)}</a>
                ${sub ? `<br><span style="font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#6b6557">${sub}</span>` : ""}
              </li>
            `;
          })
          .join("")}
      </ul>
    `
    : "";

  const upsetsHtml = has.upsets
    ? `
      <h2 style="margin:24px 0 12px;font-family:'Georgia',serif;font-size:22px;letter-spacing:-0.01em;color:#14120e">
        <em style="color:#c2410c">Climbers</em>
      </h2>
      <ul style="list-style:none;padding:0;margin:0 0 16px">
        ${upsets
          .slice(0, 5)
          .map((u) => {
            const climbed = (u.delta || 0) > 0;
            const color = climbed ? "#3f7d4f" : "#b23a3a";
            const arrow = climbed ? "↑" : "↓";
            return `
              <li style="padding:8px 0;border-bottom:1px solid rgba(20,18,14,0.08)">
                <a href="${SITE}${u.href}" style="color:#14120e;text-decoration:none;font-size:15px">${escapeHtml(u.name)}</a>
                <span style="font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#6b6557;float:right">
                  <span style="color:${color}">${arrow} ${Math.abs(u.delta)}</span> · ${u.category}
                </span>
              </li>
            `;
          })
          .join("")}
      </ul>
    `
    : "";

  const featuredHtml = has.featured
    ? `
      <h2 style="margin:24px 0 12px;font-family:'Georgia',serif;font-size:22px;letter-spacing:-0.01em;color:#14120e">
        <em style="color:#c2410c">Featured picks</em>
      </h2>
      <ul style="list-style:none;padding:0;margin:0 0 16px">
        ${featured
          .slice(0, 3)
          .map(
            (f) => `
            <li style="padding:12px;margin-bottom:8px;border:1px solid rgba(20,18,14,0.08);background:#fafaf6">
              <a href="${SITE}${f.href}" style="color:#14120e;text-decoration:none;font-size:16px;font-weight:500">${escapeHtml(f.name)}</a>
              ${f.priceUsd != null ? ` <span style="font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#c2410c">$${f.priceUsd}</span>` : ""}
              ${f.description ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:#6b6557">${escapeHtml(f.description).slice(0, 140)}</p>` : ""}
            </li>
          `
          )
          .join("")}
      </ul>
    `
    : "";

  const freshHtml = has.fresh
    ? `
      <h2 style="margin:24px 0 12px;font-family:'Georgia',serif;font-size:22px;letter-spacing:-0.01em;color:#14120e">
        <em style="color:#c2410c">Fresh in the registry</em>
      </h2>
      <ul style="list-style:none;padding:0;margin:0 0 16px">
        ${freshHighQuality
          .slice(0, 5)
          .map(
            (f) => `
            <li style="padding:6px 0">
              <a href="${SITE}${f.href}" style="color:#14120e;text-decoration:none;font-size:14px">${escapeHtml(f.name)}</a>
              <span style="font-family:'SF Mono',Menlo,monospace;font-size:10px;color:#6b6557;margin-left:6px">${f.category}${f.qualityScore != null ? ` · ${Math.round(f.qualityScore)}/100` : ""}</span>
            </li>
          `
          )
          .join("")}
      </ul>
    `
    : "";

  const emptyHtml =
    !has.achievements && !has.upsets && !has.featured && !has.fresh
      ? `<p style="margin:0 0 16px;color:#6b6557;font-style:italic">Quiet week — no rank changes worth flagging. The scrape engine added a handful of new items though; browse the registry to see what landed.</p>`
      : "";

  return {
    subject: `Versuz weekly · ${weekLabel || "what shipped"}`,
    html: brandedEmail({
      title: `<em style="color:#c2410c;font-style:italic">Weekly</em> digest`,
      preheader: weekLabel
        ? `What climbed, what shipped, what's new — ${weekLabel}`
        : "What climbed, what shipped, what's new on Versuz",
      body: `
        <p style="margin:0 0 16px;color:#6b6557;font-family:'SF Mono',Menlo,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase">${weekLabel || "This week"}</p>
        ${emptyHtml}
        ${achievementsHtml}
        ${upsetsHtml}
        ${featuredHtml}
        ${freshHtml}
        <p style="margin:24px 0 0;color:#6b6557;font-size:13px">Reply to this email if you want to flag a skill we missed — it reaches a real human.</p>
      `,
      cta: { label: "See the full leaderboard", href: `${SITE}/leaderboard` },
      unsubscribeUrl: email ? unsubLink(SITE, email) : null,
    }),
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function purchaseConfirmationEmail({ name, slug, kind, priceUsd, installCommand }) {
  const kindLabel = kind === "claude_md" ? "CLAUDE.md" : "SKILL.md";
  const url = kind === "claude_md"
    ? `${SITE}/claude-md/${slug}`
    : `${SITE}/skills/${slug}`;
  return {
    subject: `${name} is yours`,
    html: brandedEmail({
      title: `Thanks for the <em style="color:#c2410c;font-style:italic">trust</em>.`,
      preheader: `Your premium ${kindLabel} is ready`,
      body: `
        <p style="margin:0 0 16px">You just purchased <strong>${name}</strong> for $${(priceUsd || 0).toFixed(2)}.</p>
        <p style="margin:0 0 16px"><strong>Install now:</strong></p>
        <p style="margin:0 0 20px">
          <code style="display:block;background:#ece7dd;padding:14px 16px;font-family:'SF Mono',monospace;font-size:13px;border-left:3px solid #c2410c">${installCommand || `npx versuz install ${slug}`}</code>
        </p>
        <p style="margin:0 0 16px;color:#6b6557;font-size:14px">You're entitled to all future updates of this ${kindLabel}, free of charge.</p>
        <p style="margin:0;color:#6b6557;font-size:14px">A receipt has been emailed by Stripe separately. Refunds within 14 days — just reply to this email.</p>
      `,
      cta: { label: "View the listing", href: url },
    }),
  };
}
