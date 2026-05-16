#!/usr/bin/env node
import "../_env.mjs";

/**
 * send-weekly-digest.mjs
 *
 * Pulls the last 7 days of registry activity, builds a branded HTML
 * digest, and sends to every active subscriber via Resend.
 *
 * Pipeline :
 *   1. Pull recent item_achievements (last 7 days, max 6 surfaced)
 *   2. Pull recent upsets via rank_history diff (top 5 |delta|)
 *   3. Pull Versuz Featured picks (3 first-party items)
 *   4. Pull freshly indexed items with quality_score >= 80 (last 7d, top 5)
 *   5. Render via weeklyDigestEmail()
 *   6. Loop subscribers WHERE unsubscribed_at IS NULL, send via Resend
 *      with List-Unsubscribe header for Gmail one-click
 *
 * Usage :
 *   node scripts/social/send-weekly-digest.mjs           # send for real
 *   node scripts/social/send-weekly-digest.mjs --dry-run # preview, no sends
 *   node scripts/social/send-weekly-digest.mjs --to=you@x.com  # test send to one address
 *
 * The dry-run dumps the HTML to .tmp/digest-preview.html so you can open
 * it in a browser before sending to 500 people.
 *
 * Idempotency : there's no "already sent this week" check. Don't run it
 * twice. Wire it into a Friday cron (GitHub Action or Vercel cron) and
 * leave it alone.
 *
 * Required env :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY                  (falls back to dry-run if absent)
 *   NEXT_PUBLIC_SITE_URL            (used in unsub links)
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SINGLE_TO = args.find((a) => a.startsWith("--to="))?.split("=")[1] || null;
const VERBOSE = args.includes("--verbose");
const PREVIEW_PATH = ".tmp/digest-preview.html";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://versuz.dev";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[digest] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

function log(...a) {
  console.log("[digest]", ...a);
}

function weekRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    start,
    end,
    label: `${fmt(start)} → ${fmt(end)}`,
  };
}

async function loadRecentAchievements(since) {
  const { data, error } = await sb
    .from("item_achievements")
    .select(
      "id, subject_kind, skill_id, claude_md_id, type, category, metadata, unlocked_at"
    )
    .gte("unlocked_at", since.toISOString())
    .order("unlocked_at", { ascending: false })
    .limit(40);
  if (error) {
    log("achievements query failed:", error.message);
    return [];
  }
  const rows = data || [];
  if (rows.length === 0) return [];

  // Hydrate with subject metadata for direct links.
  const skillIds = rows.filter((r) => r.skill_id).map((r) => r.skill_id);
  const claudeIds = rows.filter((r) => r.claude_md_id).map((r) => r.claude_md_id);
  const [{ data: skills }, { data: claudeMds }] = await Promise.all([
    skillIds.length > 0
      ? sb.from("skills").select("id, slug, name").in("id", skillIds)
      : Promise.resolve({ data: [] }),
    claudeIds.length > 0
      ? sb
          .from("claude_md_files")
          .select("id, slug, project_category, metadata")
          .in("id", claudeIds)
      : Promise.resolve({ data: [] }),
  ]);
  const skillById = new Map((skills || []).map((s) => [s.id, s]));
  const claudeById = new Map((claudeMds || []).map((c) => [c.id, c]));

  return rows
    .map((r) => {
      if (r.subject_kind === "skill") {
        const s = skillById.get(r.skill_id);
        if (!s) return null;
        return {
          type: r.type,
          name: s.name || s.slug,
          href: `/skills/${s.slug}`,
          category: r.category,
          days: r.metadata?.days,
        };
      }
      const c = claudeById.get(r.claude_md_id);
      if (!c) return null;
      const cat = c.project_category || "generic";
      return {
        type: r.type,
        name: c.metadata?.repo
          ? `${c.metadata.author}/${c.metadata.repo}`
          : c.slug,
        href: `/claude-md/${cat}/${c.slug}`,
        category: r.category,
        days: r.metadata?.days,
      };
    })
    .filter(Boolean);
}

async function loadUpsets() {
  // Pull last 2 cycles and diff. If rank_history is empty, return [].
  const { data: cycles } = await sb
    .from("cycles")
    .select("id")
    .eq("status", "completed")
    .order("id", { ascending: false })
    .limit(2);
  if (!cycles || cycles.length < 2) return [];
  const [current, prev] = cycles;

  const [{ data: curRows }, { data: prevRows }] = await Promise.all([
    sb
      .from("rank_history")
      .select("subject_kind, subject_id, category, rank, score")
      .eq("cycle_id", current.id)
      .lte("rank", 20),
    sb
      .from("rank_history")
      .select("subject_kind, subject_id, category, rank")
      .eq("cycle_id", prev.id),
  ]);
  if (!curRows || !prevRows) return [];

  const prevByKey = new Map(
    prevRows.map((r) => [`${r.subject_kind}:${r.subject_id}:${r.category}`, r.rank])
  );
  const enriched = [];
  for (const row of curRows) {
    const key = `${row.subject_kind}:${row.subject_id}:${row.category}`;
    const prevRank = prevByKey.get(key);
    if (prevRank == null) continue;
    const delta = prevRank - row.rank; // positive = climbed
    if (Math.abs(delta) < 3) continue;
    enriched.push({ ...row, prevRank, delta });
  }
  enriched.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = enriched.slice(0, 5);
  if (top.length === 0) return [];

  // Hydrate subject names + slugs.
  const skillIds = top.filter((r) => r.subject_kind === "skill").map((r) => r.subject_id);
  const claudeIds = top.filter((r) => r.subject_kind === "claude_md").map((r) => r.subject_id);
  const [{ data: skills }, { data: claudeMds }] = await Promise.all([
    skillIds.length > 0
      ? sb.from("skills").select("id, slug, name").in("id", skillIds)
      : Promise.resolve({ data: [] }),
    claudeIds.length > 0
      ? sb
          .from("claude_md_files")
          .select("id, slug, project_category, metadata")
          .in("id", claudeIds)
      : Promise.resolve({ data: [] }),
  ]);
  const skillById = new Map((skills || []).map((s) => [s.id, s]));
  const claudeById = new Map((claudeMds || []).map((c) => [c.id, c]));

  return top
    .map((r) => {
      if (r.subject_kind === "skill") {
        const s = skillById.get(r.subject_id);
        if (!s) return null;
        return {
          name: s.name || s.slug,
          href: `/skills/${s.slug}`,
          category: r.category,
          delta: r.delta,
        };
      }
      const c = claudeById.get(r.subject_id);
      if (!c) return null;
      const cat = c.project_category || "generic";
      return {
        name: c.metadata?.repo
          ? `${c.metadata.author}/${c.metadata.repo}`
          : c.slug,
        href: `/claude-md/${cat}/${c.slug}`,
        category: r.category,
        delta: r.delta,
      };
    })
    .filter(Boolean);
}

async function loadFeatured() {
  const { data, error } = await sb
    .from("skills")
    .select("slug, name, description, price_usd")
    .eq("tier", "featured")
    .limit(3);
  if (error) {
    log("featured query failed:", error.message);
    return [];
  }
  return (data || []).map((s) => ({
    name: s.name || s.slug,
    href: `/skills/${s.slug}`,
    description: s.description,
    priceUsd: s.price_usd,
  }));
}

async function loadFreshHighQuality(since) {
  const { data, error } = await sb
    .from("skills")
    .select("slug, name, category, quality_score, scraped_at")
    .gte("scraped_at", since.toISOString())
    .gte("quality_score", 80)
    .order("quality_score", { ascending: false })
    .limit(5);
  if (error) {
    log("fresh-quality query failed:", error.message);
    return [];
  }
  return (data || []).map((s) => ({
    name: s.name || s.slug,
    href: `/skills/${s.slug}`,
    category: s.category || "—",
    qualityScore: s.quality_score,
  }));
}

async function loadSubscribers() {
  if (SINGLE_TO) return [{ email: SINGLE_TO }];
  const { data, error } = await sb
    .from("subscribers")
    .select("email")
    .is("unsubscribed_at", null)
    .neq("source", "pro-author-waitlist")
    .limit(10000);
  if (error) {
    log("subscribers query failed:", error.message);
    return [];
  }
  return data || [];
}

async function sendOne({ to, subject, html, unsubscribeUrl }) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, skipped: true };
  }
  const fromAddr = process.env.RESEND_FROM || "Versuz <hello@versuz.dev>";
  const replyToAddr = process.env.RESEND_REPLY_TO || "contact@flukxstudio.fr";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [to],
        reply_to: replyToAddr,
        subject,
        html,
        text: html.replace(/<[^>]+>/g, "").trim(),
        ...(unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.message || `Resend ${res.status}` };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Inlined template — copy-pasted from src/lib/emails/transactional.js
// because Node ESM scripts can't import .js files that use Next.js path
// aliases (@/lib/...). The template here mirrors weeklyDigestEmail()
// exactly. Update both if you change the layout.
function unsubLink(email) {
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64url");
  return `${SITE}/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ACHIEVEMENT_META = {
  triple_crown: { icon: "♛", color: "#d69e2e", label: "Triple Crown" },
  category_winner: { icon: "★", color: "#3f7d4f", label: "Category winner" },
  first_blood: { icon: "◆", color: "#2a5fa8", label: "First blood" },
  streak_milestone: { icon: "🔥", color: "#c2410c", label: "Streak milestone" },
};

function renderDigest({ weekLabel, achievements, upsets, featured, fresh, email }) {
  const ach =
    achievements.length > 0
      ? `
        <h2 style="margin:24px 0 12px;font-family:'Georgia',serif;font-size:22px;letter-spacing:-0.01em;color:#14120e">
          <em style="color:#c2410c">Unlocked this week</em>
        </h2>
        <ul style="list-style:none;padding:0;margin:0 0 16px">
        ${achievements
          .slice(0, 6)
          .map((a) => {
            const m = ACHIEVEMENT_META[a.type] || { icon: "◇", color: "#6b6557", label: a.type };
            const sub =
              a.type === "streak_milestone" && a.days
                ? `${a.days}-day streak`
                : a.category
                  ? `Category : ${a.category}`
                  : "";
            return `
            <li style="padding:10px 12px;margin-bottom:6px;border-left:3px solid ${m.color};background:#ece7dd">
              <span style="font-family:'SF Mono',Menlo,monospace;font-size:10px;color:${m.color};letter-spacing:0.16em;text-transform:uppercase">${m.icon} ${m.label}</span><br>
              <a href="${SITE}${a.href}" style="color:#14120e;text-decoration:none;font-size:16px;font-weight:500">${escapeHtml(a.name)}</a>
              ${sub ? `<br><span style="font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#6b6557">${sub}</span>` : ""}
            </li>`;
          })
          .join("")}
        </ul>
      `
      : "";

  const ups =
    upsets.length > 0
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
            </li>`;
          })
          .join("")}
        </ul>
      `
      : "";

  const feat =
    featured.length > 0
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
            </li>`
          )
          .join("")}
        </ul>
      `
      : "";

  const frh =
    fresh.length > 0
      ? `
        <h2 style="margin:24px 0 12px;font-family:'Georgia',serif;font-size:22px;letter-spacing:-0.01em;color:#14120e">
          <em style="color:#c2410c">Fresh in the registry</em>
        </h2>
        <ul style="list-style:none;padding:0;margin:0 0 16px">
        ${fresh
          .slice(0, 5)
          .map(
            (f) => `
            <li style="padding:6px 0">
              <a href="${SITE}${f.href}" style="color:#14120e;text-decoration:none;font-size:14px">${escapeHtml(f.name)}</a>
              <span style="font-family:'SF Mono',Menlo,monospace;font-size:10px;color:#6b6557;margin-left:6px">${f.category}${f.qualityScore != null ? ` · ${Math.round(f.qualityScore)}/100` : ""}</span>
            </li>`
          )
          .join("")}
        </ul>
      `
      : "";

  const empty =
    achievements.length === 0 &&
    upsets.length === 0 &&
    featured.length === 0 &&
    fresh.length === 0
      ? `<p style="margin:0 0 16px;color:#6b6557;font-style:italic">Quiet week — no rank changes worth flagging. The scrape engine added a handful of new items though; browse the registry to see what landed.</p>`
      : "";

  const unsub = email ? unsubLink(email) : null;
  const colorStripe = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2eee6">
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto" align="center">
          <tr><td colspan="4" style="height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
          <tr style="height:4px">
            <td style="height:4px;background:#c2410c;line-height:4px;font-size:0">&nbsp;</td>
            <td style="height:4px;background:#e5a644;line-height:4px;font-size:0">&nbsp;</td>
            <td style="height:4px;background:#2a5fa8;line-height:4px;font-size:0">&nbsp;</td>
            <td style="height:4px;background:#3f7d4f;line-height:4px;font-size:0">&nbsp;</td>
          </tr>
        </table>
      </td></tr>
    </table>
  `;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Versuz weekly</title></head>
<body style="margin:0;padding:0;background:#f2eee6;color:#14120e;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">What climbed, what shipped — ${weekLabel}</div>
${colorStripe}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2eee6;padding:0 16px">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:32px auto;background:#ece7dd;border:1px solid rgba(20,18,14,0.12)">
  <tr><td style="padding:36px 40px 8px">
    <span style="font-family:'SF Mono',Menlo,monospace;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#6b6557">VERSUZ · WEEKLY</span>
  </td></tr>
  <tr><td style="padding:8px 40px 8px">
    <h1 style="margin:0;font-family:'Georgia',serif;font-size:38px;line-height:1.05;letter-spacing:-0.02em;font-weight:400;color:#14120e">
      <em style="color:#c2410c;font-style:italic">Weekly</em> digest
    </h1>
  </td></tr>
  <tr><td style="padding:16px 40px 24px;font-size:16px;line-height:1.6;color:#14120e">
    <p style="margin:0 0 16px;color:#6b6557;font-family:'SF Mono',Menlo,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase">${weekLabel}</p>
    ${empty}${ach}${ups}${feat}${frh}
    <p style="margin:24px 0 0;color:#6b6557;font-size:13px">Reply to this email if you want to flag a skill we missed — it reaches a real human.</p>
  </td></tr>
  <tr><td style="padding:0 40px 32px">
    <a href="${SITE}/leaderboard" style="display:inline-block;padding:14px 24px;background:#14120e;color:#f2eee6;text-decoration:none;font-family:'SF Mono',Menlo,monospace;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;font-weight:500">See the full leaderboard →</a>
  </td></tr>
  <tr><td style="padding:24px 40px 28px;border-top:1px solid rgba(20,18,14,0.12);font-family:'SF Mono',Menlo,monospace;font-size:11px;color:#6b6557">
    <span style="font-family:'Georgia',serif;font-style:italic;font-size:18px;color:#c2410c">versuz.dev</span>
    <span style="float:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase">Skills go in. Only one wins.</span>
  </td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto 40px">
<tr><td align="center" style="font-family:'SF Mono',Menlo,monospace;font-size:10px;letter-spacing:0.12em;color:#6b6557;line-height:1.6">
  Sent by Versuz · the open benchmark for AI agent skills<br/>
  Reply to this email — it reaches a real human.
  ${unsub ? `<br/><br/><a href="${unsub}" style="color:#6b6557;text-decoration:underline">Unsubscribe</a>` : ""}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

async function main() {
  const { start, label } = weekRange();
  log(`Building digest for ${label}…`);
  if (DRY_RUN) log("DRY-RUN — no sends will happen");
  if (SINGLE_TO) log(`SINGLE-RECIPIENT mode — sending only to ${SINGLE_TO}`);

  const [achievements, upsets, featured, fresh] = await Promise.all([
    loadRecentAchievements(start),
    loadUpsets(),
    loadFeatured(),
    loadFreshHighQuality(start),
  ]);

  log(
    `data: ${achievements.length} achievements · ${upsets.length} upsets · ${featured.length} featured · ${fresh.length} fresh hi-Q`
  );

  // Dry-run : write preview to disk and bail.
  if (DRY_RUN) {
    const html = renderDigest({
      weekLabel: label,
      achievements,
      upsets,
      featured,
      fresh,
      email: "you@example.com",
    });
    if (!existsSync(dirname(PREVIEW_PATH))) {
      mkdirSync(dirname(PREVIEW_PATH), { recursive: true });
    }
    writeFileSync(PREVIEW_PATH, html);
    log(`preview written to ${PREVIEW_PATH} — open in a browser to review`);
    return;
  }

  const subs = await loadSubscribers();
  log(`sending to ${subs.length} subscriber${subs.length === 1 ? "" : "s"}…`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const sub of subs) {
    const html = renderDigest({
      weekLabel: label,
      achievements,
      upsets,
      featured,
      fresh,
      email: sub.email,
    });
    const res = await sendOne({
      to: sub.email,
      subject: `Versuz weekly · ${label}`,
      html,
      unsubscribeUrl: unsubLink(sub.email),
    });
    if (res.skipped) {
      skipped += 1;
      if (VERBOSE) log(`  ${sub.email} — skipped (no Resend key)`);
    } else if (res.ok) {
      sent += 1;
      if (VERBOSE) log(`  ${sub.email} — sent (${res.id})`);
    } else {
      failed += 1;
      log(`  ${sub.email} — FAILED : ${res.error}`);
    }
    // Resend free tier = 100 emails / day. Throttle gently.
    if (subs.length > 50) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  log(`done — sent=${sent} failed=${failed} skipped=${skipped}`);
}

main().catch((err) => {
  console.error("[digest] fatal:", err);
  process.exit(1);
});
