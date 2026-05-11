// POST /api/v1/submit
//
// Auth   : Authorization: Bearer <github-pat> (verified via GitHub /user)
// Body   : { kind: 'skill'|'claude_md', url?: string, content?: string }
//
// Anti-spam :
//   - 5 submits / heure / github_user_id (cli_submissions table)
//   - URL doit être github.com (pas d'inline raw URL non-versionnée)
//   - content size cap 200 KB
//   - duplicate URL submitted in last 24h → rejected
//
// Toujours free tier · verification_level défaut 1 si l'owner GH match,
// sinon 0. Premium passe par le web pour le paiement Stripe.

import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseSkillMd } from "../../../../../scripts/scrape/parse.mjs";
import { classifySkill } from "../../../../../scripts/scrape/classify.mjs";
import { classifyProject } from "../../../../../scripts/scrape-claude-md/classify-project.mjs";
import { contentHash } from "../../../../../scripts/_hash.mjs";
import { isOfficialOwner } from "@/lib/official-orgs";
import { judgeQualityInline } from "@/lib/quality/judge-inline";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 200 * 1024;
const RATE_LIMIT_PER_HOUR = 5;
const GITHUB_URL_RE = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\/(?:blob|tree)\/([^/]+)\/(.+?))?(?:\.git)?\/?$/i;

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseGithubUrl(url) {
  const m = url.match(GITHUB_URL_RE);
  if (!m) return null;
  return {
    owner: m[1],
    repo: (m[2] || "").replace(/\.git$/i, ""),
    ref: m[3] || "HEAD",
    path: m[4] || null,
  };
}

async function verifyGithubToken(token) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "versuz-api/1.0",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

// Returns true si le user est membre (public ou privé) de l'org.
// GitHub API : 204 = membre · 404 = pas membre · 302 = redirection (pas membre vu d'ici).
async function isOrgMember(token, org, username) {
  const res = await fetch(
    `https://api.github.com/orgs/${encodeURIComponent(org)}/members/${encodeURIComponent(username)}`,
    {
      redirect: "manual",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "versuz-api/1.0",
      },
    }
  );
  return res.status === 204;
}

async function fetchGithubRaw({ owner, repo, ref, path }) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref || "HEAD"}/${path}`;
  const res = await fetch(url, { headers: { Accept: "text/plain" } });
  if (!res.ok) throw new Error(`GitHub raw fetch ${res.status} for ${path}`);
  return res.text();
}

async function logSubmission(sb, fields) {
  try {
    await sb.from("cli_submissions").insert(fields);
  } catch (e) {
    console.warn("[submit] log failed:", e.message);
  }
}

export async function POST(request) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return Response.json({ error: "Missing Bearer token. Run `versuz login` first." }, { status: 401 });
  const token = m[1].trim();

  const ghUser = await verifyGithubToken(token);
  if (!ghUser) {
    return Response.json({ error: "GitHub rejected the token. Try `versuz login` again." }, { status: 401 });
  }

  const sb = createSupabaseAdminClient();
  if (!sb) return Response.json({ error: "Server unavailable" }, { status: 503 });

  // Rate limit : 5 / heure / github_user_id
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: countErr } = await sb
    .from("cli_submissions")
    .select("id", { count: "exact", head: true })
    .eq("github_user_id", ghUser.id)
    .gte("created_at", oneHourAgo);
  if (countErr) console.warn("[submit] rate check failed:", countErr.message);
  if ((recentCount || 0) >= RATE_LIMIT_PER_HOUR) {
    return Response.json(
      {
        error: `Rate limit : ${RATE_LIMIT_PER_HOUR} submissions per hour. Retry in ~1h.`,
      },
      { status: 429 }
    );
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const kind = body.kind === "claude_md" ? "claude_md" : "skill";
  const url = body.url ? String(body.url).trim() : null;

  // Submit nécessite une URL GitHub. Pas d'inline-only : impossible de
  // vérifier la propriété sans un repo. L'auteur doit push son skill sur
  // GitHub d'abord (c'est la norme de l'écosystème de toute façon).
  if (!url) {
    return Response.json(
      { error: "Submit requires a github.com URL. Push your SKILL.md to a repo first." },
      { status: 400 }
    );
  }

  const parsedUrl = parseGithubUrl(url);
  if (!parsedUrl) {
    return Response.json({ error: "URL must be github.com/owner/repo[/blob/ref/path]" }, { status: 400 });
  }

  // OWNERSHIP CHECK : tu ne peux submit QUE tes propres repos (perso ou
  // orgs dont tu es membre). Empêche de ratisser le travail des autres.
  const isOwnAccount = ghUser.login.toLowerCase() === parsedUrl.owner.toLowerCase();
  let isMember = false;
  if (!isOwnAccount) {
    isMember = await isOrgMember(ghUser.token || token, parsedUrl.owner, ghUser.login);
  }
  if (!isOwnAccount && !isMember) {
    await logSubmission(sb, {
      github_user_id: ghUser.id,
      github_login: ghUser.login,
      submitted_url: url,
      kind,
      result: "rejected",
      error_msg: `not owner/member of ${parsedUrl.owner}`,
    });
    return Response.json(
      {
        error: `You can only submit repos you own. ${ghUser.login} is not a member of ${parsedUrl.owner}.`,
        hint: "Fork it to your account if you want to list a derivative version.",
      },
      { status: 403 }
    );
  }

  let content = null;

  {
    // Dedup : same URL submitted in last 24h ?
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dup } = await sb
      .from("cli_submissions")
      .select("id, resulting_slug, created_at")
      .eq("submitted_url", url)
      .gte("created_at", oneDayAgo)
      .limit(1);
    if (dup && dup.length > 0) {
      return Response.json(
        { error: `URL already submitted in the last 24h (slug: ${dup[0].resulting_slug || "?"}).` },
        { status: 409 }
      );
    }
    // Fetch content from raw.githubusercontent.com
    const filePath = parsedUrl.path || (kind === "claude_md" ? "CLAUDE.md" : "SKILL.md");
    try {
      content = await fetchGithubRaw({ ...parsedUrl, path: filePath });
    } catch (e) {
      await logSubmission(sb, {
        github_user_id: ghUser.id,
        github_login: ghUser.login,
        submitted_url: url,
        kind,
        result: "error",
        error_msg: e.message,
      });
      return Response.json({ error: e.message }, { status: 502 });
    }
    if (Buffer.byteLength(content, "utf8") > MAX_BODY_BYTES) {
      return Response.json({ error: `Fetched file exceeds ${MAX_BODY_BYTES / 1024} KB` }, { status: 400 });
    }
  }

  // Parse + classify per kind
  let row;
  let resultingSlug;

  if (kind === "skill") {
    const parsed = parseSkillMd(content);
    if (!parsed.ok) {
      await logSubmission(sb, {
        github_user_id: ghUser.id,
        github_login: ghUser.login,
        submitted_url: url,
        kind,
        result: "rejected",
        error_msg: `parse failed: ${parsed.error}`,
      });
      return Response.json({ error: `SKILL.md parse failed: ${parsed.error}` }, { status: 400 });
    }
    const cls = classifySkill(parsed);
    const { owner, repo } = parsedUrl;
    resultingSlug = slugify(parsed.name) || slugify(`${owner}-${repo}`);
    // Ownership ALREADY verified ci-dessus (isOwnAccount || isMember) — donc
    // level 1 d'office. Admin peut bump à 2+ après review manuelle.
    row = {
      slug: resultingSlug,
      name: parsed.name,
      description: parsed.description,
      github_url: `https://github.com/${owner}/${repo}`,
      github_stars: 0,
      category: cls.id,
      skill_md_content: content,
      content_hash: contentHash(content),
      is_official: isOfficialOwner(owner),
      metadata: {
        owner,
        repo,
        path: parsedUrl.path || "SKILL.md",
        author: ghUser.login,
        tools: parsed.tools,
        model: parsed.model,
        classifier_confidence: cls.confidence,
        skill_type: "minimal",
        bundle_files: [],
        bundle_size_bytes: 0,
        submitted_via: "cli",
        submitted_by_login: ghUser.login,
        submitted_by_user_id: ghUser.id,
        org_member: isMember,
      },
      tier: "free",
      verification_level: 1,
      verified_at: new Date().toISOString(),
      bench_pending: true,
    };
  } else {
    const { owner, repo } = parsedUrl;
    const cls = classifyProject({ rootFiles: [], content, language: null });
    resultingSlug = slugify(`${owner}-${repo}`);
    const descMatch = content.match(/^#\s+(.+)$/m);
    const description = (descMatch?.[1] || `${owner}/${repo} CLAUDE.md`).slice(0, 240);
    row = {
      slug: resultingSlug,
      github_url: `https://github.com/${owner}/${repo}`,
      github_stars: 0,
      description,
      project_category: cls.id,
      content,
      content_hash: contentHash(content),
      is_official: isOfficialOwner(owner),
      // word_count GENERATED column (migration 0002), pas writable
      metadata: {
        owner,
        repo,
        author: ghUser.login,
        classifier_confidence: cls.confidence,
        submitted_via: "cli",
        submitted_by_login: ghUser.login,
        submitted_by_user_id: ghUser.id,
        org_member: isMember,
      },
      tier: "free",
      verification_level: 1,
      verified_at: new Date().toISOString(),
      bench_pending: true,
    };
  }

  // Upsert (free, service-role bypass RLS — already validated everything)
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const { data: upserted, error: upErr } = await sb
    .from(table)
    .upsert(row, { onConflict: "slug" })
    .select("id, slug, verification_level")
    .maybeSingle();

  if (upErr) {
    await logSubmission(sb, {
      github_user_id: ghUser.id,
      github_login: ghUser.login,
      submitted_url: url,
      kind,
      result: "error",
      error_msg: upErr.message,
    });
    return Response.json({ error: `DB upsert failed: ${upErr.message}` }, { status: 500 });
  }

  await logSubmission(sb, {
    github_user_id: ghUser.id,
    github_login: ghUser.login,
    submitted_url: url,
    kind,
    result: "success",
    resulting_slug: upserted?.slug || resultingSlug,
  });

  // Fire inline quality judge in background — runs AFTER the response is sent
  // so the user gets a fast reply, and the row picks up its quality_score
  // within ~2-5 sec instead of waiting 6h for the cron.
  const submittedSlug = upserted?.slug || resultingSlug;
  const submittedContent = kind === "skill" ? row.skill_md_content : row.content;
  const submittedName = kind === "skill" ? row.name : submittedSlug;
  after(async () => {
    try {
      await judgeQualityInline(sb, kind, submittedSlug, submittedContent, submittedName);
    } catch (e) {
      console.warn(`[submit] background quality judge failed: ${e.message}`);
    }
  });

  return Response.json({
    api_version: "v1",
    ok: true,
    kind,
    slug: upserted?.slug || resultingSlug,
    verification_level: upserted?.verification_level ?? row.verification_level,
    via: isOwnAccount ? "self" : "org_member",
    view_url: `${request.nextUrl.origin}/${kind === "claude_md" ? "claude-md/" + (row.project_category) + "/" : "skills/"}${upserted?.slug || resultingSlug}`,
  });
}
