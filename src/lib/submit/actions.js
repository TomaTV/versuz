"use server";

/**
 * Submit server actions — real DB writes.
 *
 * Two submission paths per kind (skill / claude_md):
 *   1. Paste a public GitHub URL → server fetches the file via
 *      raw.githubusercontent.com and parses it inline
 *   2. Paste/upload the file content directly → parsed inline
 *
 * Verification is automatic when the OAuth GitHub login matches the repo
 * owner (extracted from `auth.users.raw_user_meta_data->>'user_name'`).
 *
 * RLS: see migration 0007. authenticated users can insert with
 * author_user_id = auth.uid(), tier='free', verification_level<=1. Anything
 * else (premium, featured, level>=2) is admin-only via service role.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { parseSkillMd } from "../../../scripts/scrape/parse.mjs";
import { classifySkill } from "../../../scripts/scrape/classify.mjs";
import { uploadPremiumFile } from "@/lib/premium/storage";
import { sendEmail } from "@/lib/resend";
import { submitConfirmationEmail } from "@/lib/emails/transactional";

// Cap premium uploads at 10 MB. Server action body limit is configurable
// (next.config.mjs `experimental.serverActions.bodySizeLimit`) but we don't
// want to lift the global limit just for this — keep premium payloads small.
const MAX_PREMIUM_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Sanitize the (tier, price_usd) the user selected in the form. Returns a
 * tuple { tier, priceUsd, useAdmin } — `useAdmin` means we'll bypass RLS
 * (which forbids self-listing premium) after we've validated ownership in code.
 */
function parseTierChoice(formData) {
  const tier = String(formData.get("tier") || "free");
  if (tier !== "premium") return { tier: "free", priceUsd: null, useAdmin: false };
  // Tolerate locale quirks : a French user may type "4,99" or "$4.99 " or
  // "  4.99  ". Strip currency markers + whitespace, normalize comma→dot,
  // then parse. Without this, `Number("4,99")` returns NaN and the submit
  // fails with the generic "between $0.50 and $999" error even though the
  // user typed a valid price.
  const rawStr = String(formData.get("price_usd") || "")
    .replace(/[\s$€£,]/g, (m) => (m === "," ? "." : ""))
    .trim();
  const raw = Number(rawStr);
  if (!Number.isFinite(raw) || raw < 0.5 || raw > 999) {
    return { error: "Premium price must be between $0.50 and $999." };
  }
  return { tier: "premium", priceUsd: Math.round(raw * 100) / 100, useAdmin: true };
}

/**
 * Extract an optional premium-content upload from the form. Returns null when
 * no file was attached (legacy "badge-only" premium listings stay supported).
 */
function readPremiumFile(formData, tier) {
  if (tier !== "premium") return { file: null };
  const f = formData.get("premium_file");
  if (!f || typeof f === "string") return { file: null };
  if (typeof f.size !== "number" || f.size === 0) return { file: null };
  if (f.size > MAX_PREMIUM_FILE_BYTES) {
    return { error: `Premium upload exceeds ${MAX_PREMIUM_FILE_BYTES / 1024 / 1024} MB.` };
  }
  return { file: f };
}

const GITHUB_URL_RE = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\/(blob|tree)\/([^/]+)\/(.+))?(?:\.git)?\/?$/i;

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function shortSha(content) {
  // Stable-ish identifier for dedup in metadata.sha. Not cryptographic.
  let h = 5381;
  for (let i = 0; i < content.length; i++) h = ((h << 5) + h + content.charCodeAt(i)) | 0;
  return `submit-${(h >>> 0).toString(16)}`;
}

function parseGithubUrl(url) {
  const m = url.match(GITHUB_URL_RE);
  if (!m) return null;
  const owner = m[1];
  const repo = (m[2] || "").replace(/\.git$/i, "");
  const path = m[5] || null;
  return { owner, repo, path };
}

async function fetchGithubFile(owner, repo, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
  const res = await fetch(url, { headers: { Accept: "text/plain" } });
  if (!res.ok) throw new Error(`GitHub fetch ${res.status} for ${owner}/${repo}/${path}`);
  return await res.text();
}

function ghLogin(user) {
  return (
    user?.user_metadata?.user_name ||
    user?.user_metadata?.preferred_username ||
    user?.identities?.find?.((i) => i.provider === "github")?.identity_data?.user_name ||
    null
  );
}

async function commonGuard() {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first — /login" };
  const sb = await createSupabaseServerClient();
  if (!sb) return { error: "Database not configured." };
  return { user, sb };
}

/* -------------------------------------------------------------------- */
/* SKILLS                                                                */
/* -------------------------------------------------------------------- */

async function insertSkillRow(sb, user, { content, owner, repo, path, urlOwnerLogin, tier = "free", priceUsd = null, useAdmin = false, premiumFile = null }) {
  const parsed = parseSkillMd(content);
  if (!parsed.ok) return { error: `Could not parse SKILL.md: ${parsed.error}` };

  // Classifier now always returns an id (falls back to 'other' if no match).
  // Items in 'other' land in the marketplace but are skipped by the bench
  // engine — see scripts/scrape/classify.mjs + migration 0018.
  const cls = classifySkill(parsed);

  const slug = slugify(parsed.name) || slugify(`${owner || "user"}-${repo || "skill"}`);
  if (!slug) return { error: "Could not derive a slug from the skill name." };

  const login = ghLogin(user);
  const ownsRepo = login && urlOwnerLogin && login.toLowerCase() === urlOwnerLogin.toLowerCase();
  const verificationLevel = ownsRepo ? 1 : 0;

  const row = {
    slug,
    name: parsed.name,
    description: parsed.description,
    github_url: owner && repo ? `https://github.com/${owner}/${repo}` : `https://versuz.dev/u/${user.id}/${slug}`,
    github_stars: 0,
    category: cls.id,
    skill_md_content: content,
    metadata: {
      owner: owner || null,
      repo: repo || null,
      path: path || "SKILL.md",
      author: owner || login || null,
      tools: parsed.tools,
      model: parsed.model,
      classifier_confidence: cls.confidence,
      skill_type: "minimal",
      bundle_files: [],
      bundle_size_bytes: 0,
      submitted_via: owner ? "github_url" : "inline",
      submitted_by_login: login,
      sha: shortSha(content),
    },
    tier,
    price_usd: tier === "free" ? null : priceUsd,
    author_user_id: user.id,
    verification_level: verificationLevel,
    verified_at: ownsRepo ? new Date().toISOString() : null,
    bench_pending: true,
  };

  // Premium self-listings bypass RLS (which forbids tier!='free' inserts from
  // authenticated users — see migration 0007). We've already pinned
  // author_user_id = user.id and validated price in parseTierChoice.
  const writer = useAdmin ? createSupabaseAdminClient() : sb;
  if (!writer) return { error: "Database client unavailable." };

  const { data, error } = await writer
    .from("skills")
    .upsert(row, { onConflict: "slug" })
    .select("id, slug, verification_level")
    .maybeSingle();

  if (error) return { error: `DB insert failed: ${error.message}` };

  // Fire inline quality judge in the background — best-effort, swallows errors.
  // Items pick up a quality_score within ~2-5 sec instead of waiting 6h.
  const { judgeQualityInline } = await import("@/lib/quality/judge-inline");
  const { after } = await import("next/server");
  const judgedSlug = data?.slug || slug;
  after(async () => {
    try {
      const admin = createSupabaseAdminClient();
      if (admin) await judgeQualityInline(admin, "skill", judgedSlug, content, parsed.name);
    } catch (e) {
      console.warn(`[submit] inline quality judge failed: ${e.message}`);
    }
  });

  // Confirmation email — best-effort, non-blocking
  if (user?.email) {
    after(async () => {
      try {
        const { subject, html } = submitConfirmationEmail({
          kind: "skill",
          slug: judgedSlug,
          name: parsed.name,
        });
        await sendEmail({ to: user.email, subject, html });
      } catch (e) {
        console.warn(`[submit] confirmation email failed: ${e.message}`);
      }
    });
  }

  // Premium tier with an uploaded payload → push it into the private bucket
  // and stamp `private_storage_path` onto the row. Failure here is fatal:
  // a half-listed premium item with no download is worse than a clear error.
  if (tier === "premium" && premiumFile && data?.id) {
    const buf = Buffer.from(await premiumFile.arrayBuffer());
    const upload = await uploadPremiumFile({
      kind: "skill",
      subjectId: data.id,
      filename: premiumFile.name || "SKILL.md",
      body: buf,
      contentType: premiumFile.type || "text/markdown",
    });
    if (upload.error) return { error: `Premium upload failed: ${upload.error}` };
    const { error: pathErr } = await writer
      .from("skills")
      .update({ private_storage_path: upload.path })
      .eq("id", data.id);
    if (pathErr) return { error: `Storing path failed: ${pathErr.message}` };
  }

  return {
    ok: true,
    slug: data?.slug || slug,
    verificationLevel: data?.verification_level ?? verificationLevel,
    ownsRepo,
    classified: cls.id,
  };
}

export async function submitSkillFromUrl(formData) {
  const url = String(formData.get("github_url") || "").trim();
  const parsedUrl = parseGithubUrl(url);
  if (!parsedUrl) return { error: "Paste a github.com/owner/repo URL." };

  const tierChoice = parseTierChoice(formData);
  if (tierChoice.error) return tierChoice;

  const fileChoice = readPremiumFile(formData, tierChoice.tier);
  if (fileChoice.error) return fileChoice;

  const guard = await commonGuard();
  if (guard.error) return guard;
  const { user, sb } = guard;

  const path = parsedUrl.path && /SKILL\.md$/i.test(parsedUrl.path) ? parsedUrl.path : "SKILL.md";

  let content;
  try {
    content = await fetchGithubFile(parsedUrl.owner, parsedUrl.repo, path);
  } catch (err) {
    return { error: err.message };
  }

  const result = await insertSkillRow(sb, user, {
    content,
    owner: parsedUrl.owner,
    repo: parsedUrl.repo,
    path,
    urlOwnerLogin: parsedUrl.owner,
    tier: tierChoice.tier,
    priceUsd: tierChoice.priceUsd,
    useAdmin: tierChoice.useAdmin,
    premiumFile: fileChoice.file,
  });
  if (result.error) return result;

  const baseMsg = result.ownsRepo
    ? `${parsedUrl.owner}/${parsedUrl.repo} added and claimed (verified level 1).`
    : `${parsedUrl.owner}/${parsedUrl.repo} added. Sign in with the GitHub account that owns the repo to claim it.`;
  const otherSuffix =
    result.classified === "other"
      ? " Note: classified as 'Other' — appears in /marketplace but won't be ranked on /leaderboard until we have tasks for that domain."
      : "";
  return {
    ok: true,
    message: baseMsg + otherSuffix,
    meta: {
      kind: "skill",
      slug: result.slug,
      category: result.classified,
      verificationLevel: result.verificationLevel,
    },
  };
}

export async function submitSkillFromContent(formData) {
  const name = String(formData.get("name") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!name || !content) return { error: "Name and SKILL.md content are required." };
  if (content.length < 80) return { error: "Content too short — paste the full SKILL.md." };

  const tierChoice = parseTierChoice(formData);
  if (tierChoice.error) return tierChoice;

  const fileChoice = readPremiumFile(formData, tierChoice.tier);
  if (fileChoice.error) return fileChoice;

  const guard = await commonGuard();
  if (guard.error) return guard;
  const { user, sb } = guard;

  // Inject name into frontmatter if absent so parseSkillMd succeeds.
  const finalContent = /^---\s*\n/.test(content)
    ? content
    : `---\nname: ${name}\n---\n\n${content}`;

  const result = await insertSkillRow(sb, user, {
    content: finalContent,
    owner: null,
    repo: null,
    path: null,
    urlOwnerLogin: null,
    tier: tierChoice.tier,
    priceUsd: tierChoice.priceUsd,
    useAdmin: tierChoice.useAdmin,
    premiumFile: fileChoice.file,
  });
  if (result.error) return result;

  return {
    ok: true,
    message:
      `${name} added to the registry.` +
      (result.classified === "other"
        ? " Note: classified as 'Other' — appears in /marketplace but won't be ranked on /leaderboard until we have tasks for that domain."
        : ""),
    meta: {
      kind: "skill",
      slug: result.slug,
      category: result.classified,
      verificationLevel: result.verificationLevel,
    },
  };
}

/* -------------------------------------------------------------------- */
/* CLAUDE.md                                                             */
/* -------------------------------------------------------------------- */

const PROJECT_CATEGORIES = new Set([
  "nextjs",
  "react",
  "python-data",
  "backend-api",
  "mobile",
  "devops",
  "ml-training",
  "generic",
]);

function extractDescription(content) {
  const stripped = content.replace(/^#.*$/m, "").trim();
  const firstPara = stripped.split(/\n\s*\n/)[0] || "";
  return firstPara.replace(/\s+/g, " ").trim().slice(0, 240);
}

async function insertClaudeMdRow(sb, user, { content, owner, repo, urlOwnerLogin, projectCategory, slugHint, tier = "free", priceUsd = null, useAdmin = false }) {
  if (!PROJECT_CATEGORIES.has(projectCategory)) {
    return {
      error: `Project category must be one of: ${[...PROJECT_CATEGORIES].join(", ")}`,
    };
  }
  if (content.trim().length < 50) return { error: "CLAUDE.md content too short." };

  const baseSlug =
    slugify(slugHint) ||
    slugify(`${owner || "user"}-${repo || "claude-md"}`) ||
    `cmd-${user.id.slice(0, 8)}`;

  const login = ghLogin(user);
  const ownsRepo = login && urlOwnerLogin && login.toLowerCase() === urlOwnerLogin.toLowerCase();
  const verificationLevel = ownsRepo ? 1 : 0;

  const row = {
    slug: baseSlug,
    github_url:
      owner && repo
        ? `https://github.com/${owner}/${repo}`
        : `https://versuz.dev/u/${user.id}/${baseSlug}`,
    github_stars: 0,
    description: extractDescription(content),
    project_category: projectCategory,
    content,
    metadata: {
      owner: owner || null,
      repo: repo || null,
      author: owner || login || null,
      submitted_via: owner ? "github_url" : "inline",
      submitted_by_login: login,
      sha: shortSha(content),
    },
    tier,
    price_usd: tier === "free" ? null : priceUsd,
    author_user_id: user.id,
    verification_level: verificationLevel,
    verified_at: ownsRepo ? new Date().toISOString() : null,
    bench_pending: true,
  };

  const writer = useAdmin ? createSupabaseAdminClient() : sb;
  if (!writer) return { error: "Database client unavailable." };

  const { data, error } = await writer
    .from("claude_md_files")
    .upsert(row, { onConflict: "slug" })
    .select("slug, verification_level")
    .maybeSingle();

  if (error) return { error: `DB insert failed: ${error.message}` };

  // Background quality judge — runs after response sent
  const { judgeQualityInline } = await import("@/lib/quality/judge-inline");
  const { after } = await import("next/server");
  const judgedSlug = data?.slug || baseSlug;
  after(async () => {
    try {
      const admin = createSupabaseAdminClient();
      if (admin) await judgeQualityInline(admin, "claude_md", judgedSlug, content, judgedSlug);
    } catch (e) {
      console.warn(`[submit] inline quality judge failed: ${e.message}`);
    }
  });

  // Confirmation email — best-effort, non-blocking
  if (user?.email) {
    after(async () => {
      try {
        const { subject, html } = submitConfirmationEmail({
          kind: "claude_md",
          slug: judgedSlug,
          name: judgedSlug,
        });
        await sendEmail({ to: user.email, subject, html });
      } catch (e) {
        console.warn(`[submit] confirmation email failed: ${e.message}`);
      }
    });
  }

  return {
    ok: true,
    slug: data?.slug || baseSlug,
    verificationLevel: data?.verification_level ?? verificationLevel,
    ownsRepo,
  };
}

export async function submitClaudeMdFromUrl(formData) {
  const url = String(formData.get("github_url") || "").trim();
  const projectCategory = String(formData.get("project_category") || "generic").trim();
  const parsedUrl = parseGithubUrl(url);
  if (!parsedUrl) return { error: "Paste a github.com/owner/repo URL." };

  const tierChoice = parseTierChoice(formData);
  if (tierChoice.error) return tierChoice;

  const guard = await commonGuard();
  if (guard.error) return guard;
  const { user, sb } = guard;

  let content;
  try {
    content = await fetchGithubFile(parsedUrl.owner, parsedUrl.repo, "CLAUDE.md");
  } catch (err) {
    return { error: err.message };
  }

  const result = await insertClaudeMdRow(sb, user, {
    content,
    owner: parsedUrl.owner,
    repo: parsedUrl.repo,
    urlOwnerLogin: parsedUrl.owner,
    projectCategory,
    slugHint: `${parsedUrl.owner}-${parsedUrl.repo}`,
    tier: tierChoice.tier,
    priceUsd: tierChoice.priceUsd,
    useAdmin: tierChoice.useAdmin,
  });
  if (result.error) return result;

  return {
    ok: true,
    message: result.ownsRepo
      ? `${parsedUrl.owner}/${parsedUrl.repo} CLAUDE.md added and claimed (verified level 1).`
      : `${parsedUrl.owner}/${parsedUrl.repo} CLAUDE.md added. Sign in with the GitHub account that owns the repo to claim it.`,
    meta: {
      kind: "claude_md",
      slug: result.slug,
      project_category: projectCategory,
      verificationLevel: result.verificationLevel,
    },
  };
}

export async function submitClaudeMdFromContent(formData) {
  const name = String(formData.get("name") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const projectCategory = String(formData.get("project_category") || "generic").trim();
  if (!name || !content) return { error: "Name and CLAUDE.md content are required." };

  const tierChoice = parseTierChoice(formData);
  if (tierChoice.error) return tierChoice;

  const guard = await commonGuard();
  if (guard.error) return guard;
  const { user, sb } = guard;

  const result = await insertClaudeMdRow(sb, user, {
    content,
    owner: null,
    repo: null,
    urlOwnerLogin: null,
    projectCategory,
    slugHint: name,
    tier: tierChoice.tier,
    priceUsd: tierChoice.priceUsd,
    useAdmin: tierChoice.useAdmin,
  });
  if (result.error) return result;

  return {
    ok: true,
    message: `${name} CLAUDE.md added to the registry.`,
    meta: {
      kind: "claude_md",
      slug: result.slug,
      project_category: projectCategory,
      verificationLevel: result.verificationLevel,
    },
  };
}

/* -------------------------------------------------------------------- */
/* SELF-MANAGE (delete / update own items)                               */
/* -------------------------------------------------------------------- */

/**
 * Delete a skill or claude_md owned by the current user. Refuses if the
 * row's author_user_id doesn't match auth.uid(). Bypasses RLS via service
 * role since RLS doesn't allow self-deletes (only admins can drop rows).
 *
 * Form action — called from /profile rows.
 */
export async function deleteOwnSubject(formData) {
  const slug = String(formData.get("slug") || "");
  const kindRaw = String(formData.get("kind") || "");
  const kind = kindRaw === "claude_md" || kindRaw === "claude-md" ? "claude_md" : "skill";
  if (!slug) return { error: "Missing slug" };

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in required" };

  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "Database client unavailable" };

  const table = kind === "claude_md" ? "claude_md_files" : "skills";

  const { data: row, error: readErr } = await sb
    .from(table)
    .select("id, author_user_id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (readErr) return { error: `Lookup failed: ${readErr.message}` };
  if (!row) return { error: "Not found" };
  if (row.author_user_id !== user.id) {
    return { error: "Not your item — refusing to delete." };
  }

  const { error: delErr } = await sb.from(table).delete().eq("id", row.id);
  if (delErr) return { error: `Delete failed: ${delErr.message}` };

  revalidatePath("/profile");
  revalidatePath("/marketplace");
  return { ok: true };
}

/**
 * Update tier + price on a self-owned item. Same ownership guard as delete.
 * Used by the per-item settings page.
 */
export async function updateOwnSubjectListing(formData) {
  const slug = String(formData.get("slug") || "");
  const kindRaw = String(formData.get("kind") || "");
  const kind = kindRaw === "claude_md" || kindRaw === "claude-md" ? "claude_md" : "skill";
  if (!slug) return { error: "Missing slug" };

  const requestedTier = String(formData.get("tier") || "free");
  if (!["free", "premium", "featured"].includes(requestedTier)) {
    return { error: "Tier must be free, premium, or featured" };
  }

  // Description is optional — null means "no change"
  const descRaw = formData.get("description");
  const description = descRaw == null ? null : String(descRaw).slice(0, 600).trim();

  const user = await getCurrentUser();
  if (!user) return { error: "Sign in required" };
  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "Database client unavailable" };

  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const { data: row } = await sb
    .from(table)
    .select("id, author_user_id, tier")
    .eq("slug", slug)
    .maybeSingle();
  if (!row) return { error: "Not found" };
  if (row.author_user_id !== user.id) return { error: "Not your item." };

  // Protect featured tier : authors can edit price + description but cannot
  // demote a featured listing themselves (Versuz editorial decision).
  let tier = requestedTier;
  if (row.tier === "featured" && requestedTier !== "featured") {
    tier = "featured"; // silently keep featured — UI doesn't even offer a downgrade
  }
  if (row.tier !== "featured" && requestedTier === "featured") {
    return { error: "Featured tier is admin-only. Contact support to feature a listing." };
  }

  // Price required for premium + featured
  let priceUsd = null;
  if (tier === "premium" || tier === "featured") {
    const raw = Number(formData.get("price_usd"));
    if (!Number.isFinite(raw) || raw < 0.5 || raw > 999) {
      return { error: "Price must be between $0.50 and $999." };
    }
    priceUsd = Math.round(raw * 100) / 100;
  }

  const updatePayload = { tier, price_usd: priceUsd };
  if (description !== null) updatePayload.description = description;

  const { error } = await sb.from(table).update(updatePayload).eq("id", row.id);
  if (error) return { error: `Update failed: ${error.message}` };

  revalidatePath("/profile");
  revalidatePath(`/profile/items/${kindRaw}/${slug}`);
  revalidatePath("/marketplace");
  return { ok: true };
}
