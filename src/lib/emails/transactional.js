import { brandedEmail } from "./template";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

export function welcomeSubscribeEmail() {
  return {
    subject: "You're in — Versuz weekly digest",
    html: brandedEmail({
      title: `You're <em style="color:#c2410c;font-style:italic">in</em>.`,
      preheader: "Top-ranked SKILL.md and CLAUDE.md, every Friday.",
      body: `
        <p style="margin:0 0 16px">Thanks for subscribing.</p>
        <p style="margin:0 0 16px">Every Friday we send a short digest — the top-ranked SKILL.md and CLAUDE.md files of the week, plus what shipped on Versuz.</p>
        <p style="margin:0 0 16px">Nothing else. No spam, no upsells.</p>
        <p style="margin:0;color:#6b6557;font-size:14px">If this was a mistake, just hit reply and we'll remove you.</p>
      `,
      cta: { label: "Browse the marketplace", href: `${SITE}/marketplace` },
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

export function reengagementEmail({ githubLogin, daysInactive }) {
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
    }),
  };
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
