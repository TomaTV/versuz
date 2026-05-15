"use server";

/**
 * Admin server actions. All callers MUST be admins (checked via requireAdmin).
 * Uses the service-role Supabase client to bypass RLS.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function adminGuard() {
  const user = await requireAdmin();
  if (!user) return { error: "Forbidden" };
  const sb = createSupabaseAdminClient();
  if (!sb) return { error: "Service-role Supabase client not configured." };
  return { user, sb };
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/* -------------------------------------------------------------------- */
/* Task proposals                                                        */
/* -------------------------------------------------------------------- */

export async function approveTaskProposal(formData) {
  const id = String(formData.get("id") || "");
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;

  const { data: proposal, error: e1 } = await sb
    .from("task_proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (e1) return { error: e1.message };
  if (!proposal) return { error: "Proposal not found" };
  if (proposal.status !== "pending") return { error: `Already ${proposal.status}` };

  const baseSlug = slugify(`${proposal.subject_kind}-${proposal.category}-${proposal.title}`);
  const slug = baseSlug || `task-${id.slice(0, 8)}`;

  const { data: task, error: e2 } = await sb
    .from("tasks")
    .insert({
      category: proposal.category,
      slug,
      title: proposal.title,
      description: proposal.description,
      input_data: proposal.input_data || {},
      rubric: {
        signal: proposal.expected_output_signal,
        difficulty: proposal.difficulty,
      },
      difficulty: proposal.difficulty || "medium",
    })
    .select("id")
    .maybeSingle();
  if (e2) return { error: `Insert task failed: ${e2.message}` };

  const { error: e3 } = await sb
    .from("task_proposals")
    .update({
      status: "approved",
      promoted_task_id: task?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (e3) return { error: `Update proposal failed: ${e3.message}` };

  revalidatePath("/admin/task-proposals");
  return { ok: true, taskId: task?.id, slug };
}

export async function rejectTaskProposal(formData) {
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").slice(0, 500) || null;
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;

  const { error } = await sb
    .from("task_proposals")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath("/admin/task-proposals");
  return { ok: true };
}

export async function deleteTaskProposal(formData) {
  const id = String(formData.get("id") || "");
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;

  const { error } = await sb.from("task_proposals").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/task-proposals");
  return { ok: true };
}

/* -------------------------------------------------------------------- */
/* Registry edit (skills + claude_md_files)                              */
/* -------------------------------------------------------------------- */

const ALLOWED_LEVELS = new Set([0, 1, 2, 3, 4]);
const ALLOWED_TIERS = new Set(["free", "premium", "featured"]);

async function updateSubject(table, slug, patch) {
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const { error } = await sb.from(table).update(patch).eq("slug", slug);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function setVerificationLevel(formData) {
  const slug = String(formData.get("slug") || "");
  const kind = String(formData.get("kind") || "skill");
  const level = Number(formData.get("level"));
  if (!ALLOWED_LEVELS.has(level)) return { error: "Invalid verification level" };
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const res = await updateSubject(table, slug, {
    verification_level: level,
    verified_at: level >= 1 ? new Date().toISOString() : null,
  });
  revalidatePath(`/admin/${kind === "claude_md" ? "claude-md" : "skills"}`);
  return res;
}

export async function setTier(formData) {
  const slug = String(formData.get("slug") || "");
  const kind = String(formData.get("kind") || "skill");
  const tier = String(formData.get("tier") || "free");
  const priceUsd = Number(formData.get("price_usd"));
  if (!ALLOWED_TIERS.has(tier)) return { error: "Invalid tier" };
  if (tier !== "free" && !(priceUsd > 0)) {
    return { error: "Price required for premium/featured tiers" };
  }
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const patch =
    tier === "free"
      ? { tier, price_usd: null }
      : { tier, price_usd: priceUsd };
  const res = await updateSubject(table, slug, patch);
  revalidatePath(`/admin/${kind === "claude_md" ? "claude-md" : "skills"}`);
  return res;
}

export async function deleteSubject(formData) {
  const slug = String(formData.get("slug") || "");
  const kind = String(formData.get("kind") || "skill");
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const table = kind === "claude_md" ? "claude_md_files" : "skills";
  const { error } = await sb.from(table).delete().eq("slug", slug);
  if (error) return { error: error.message };
  revalidatePath(`/admin/${kind === "claude_md" ? "claude-md" : "skills"}`);
  return { ok: true };
}

/* -------------------------------------------------------------------- */
/* BULK admin actions on subjects                                        */
/* -------------------------------------------------------------------- */

/**
 * Apply an action to a list of slugs. Supported actions :
 *   verify        → verification_level=2 + verified_at=now
 *   reviewed      → verification_level=3 + verified_at=now
 *   featured      → verification_level=4 + verified_at=now (admin curation)
 *   unverify      → verification_level=0 + verified_at=null
 *   delete        → DELETE rows
 *   tier-free     → tier='free', price_usd=null
 *
 * Refuses if `slugs` is missing/empty. Returns { ok, affected }.
 */
export async function bulkSubjectAction(formData) {
  const kindRaw = String(formData.get("kind") || "skill");
  const kind = kindRaw === "claude_md" || kindRaw === "claude-md" ? "claude_md" : "skill";
  const action = String(formData.get("action") || "");
  // Accept slugs as either a comma-separated string or multiple form fields.
  const slugsRaw = formData.getAll("slugs");
  let slugs;
  if (slugsRaw.length === 1 && typeof slugsRaw[0] === "string" && slugsRaw[0].includes(",")) {
    slugs = slugsRaw[0].split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    slugs = slugsRaw.map(String).filter(Boolean);
  }
  if (!slugs.length) return { error: "No items selected" };

  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const table = kind === "claude_md" ? "claude_md_files" : "skills";

  let result;
  const nowIso = new Date().toISOString();
  if (action === "delete") {
    result = await sb.from(table).delete().in("slug", slugs);
  } else if (action === "verify") {
    result = await sb.from(table).update({ verification_level: 2, verified_at: nowIso }).in("slug", slugs);
  } else if (action === "reviewed") {
    result = await sb.from(table).update({ verification_level: 3, verified_at: nowIso }).in("slug", slugs);
  } else if (action === "featured") {
    result = await sb.from(table).update({ verification_level: 4, verified_at: nowIso }).in("slug", slugs);
  } else if (action === "unverify") {
    result = await sb.from(table).update({ verification_level: 0, verified_at: null }).in("slug", slugs);
  } else if (action === "tier-free") {
    // Setting tier=free requires nulling price_usd in same UPDATE due to CHECK.
    result = await sb.from(table).update({ tier: "free", price_usd: null }).in("slug", slugs);
  } else if (action === "set-category") {
    const targetCategory = String(formData.get("target_category") || "").trim();
    if (!targetCategory) return { error: "Missing target_category" };
    const col = kind === "claude_md" ? "project_category" : "category";
    result = await sb.from(table).update({ [col]: targetCategory }).in("slug", slugs);
  } else if (action === "reclassify") {
    // Re-run le keyword classifier sur chaque item sélectionné. Pour skill on
    // utilise classifySkill, pour claude_md classifyProject. Update les rows
    // une par une car chacune a sa propre catégorie cible.
    const { classifySkill } = await import("../../../scripts/scrape/classify.mjs");
    const { classifyProject } = await import("../../../scripts/scrape-claude-md/classify-project.mjs");
    const sel = kind === "skill"
      ? "id, slug, name, description, skill_md_content, metadata"
      : "id, slug, description, content, metadata";
    const { data: items, error: fetchErr } = await sb.from(table).select(sel).in("slug", slugs);
    if (fetchErr) return { error: fetchErr.message };
    let updated = 0;
    let landed = { document: 0, sql: 0, data: 0, web: 0, shell: 0, code: 0, other: 0,
                   nextjs: 0, react: 0, "python-data": 0, "backend-api": 0, mobile: 0,
                   devops: 0, "ml-training": 0, generic: 0 };
    for (const item of items || []) {
      const meta = item.metadata || {};
      const cls = kind === "skill"
        ? classifySkill({
            name: item.name,
            description: item.description,
            body: item.skill_md_content,
            tools: meta.tools || [],
          })
        : classifyProject({
            rootFiles: [],
            content: item.content,
            language: meta.language,
          });
      if (!cls?.id) continue;
      const col = kind === "claude_md" ? "project_category" : "category";
      const { error: updErr } = await sb.from(table).update({ [col]: cls.id }).eq("id", item.id);
      if (!updErr) {
        updated += 1;
        landed[cls.id] = (landed[cls.id] || 0) + 1;
      }
    }
    revalidatePath(`/admin/${kind === "claude_md" ? "claude-md" : "skills"}`);
    revalidatePath("/marketplace");
    return { ok: true, affected: updated, action, landed };
  } else if (action === "bench-priority") {
    // Set bench_pending=true → next bench cycle picks these items first.
    // Used to prioritize manually : right after a boost/featured upgrade,
    // or when an item needs a re-judge (controversy, content updated, etc.).
    result = await sb
      .from(table)
      .update({ bench_pending: true })
      .in("slug", slugs);
  } else if (action === "force-quality") {
    // Run the inline quality judge on each item NOW (no wait for the 4h cron).
    // Pull content via storage resolver then call judgeQualityInline.
    const { judgeQualityInline } = await import("@/lib/quality/judge-inline");
    const { fetchContentByPath } = await import("../content/storage");
    const sel = kind === "skill"
      ? "id, slug, name, skill_md_content, content_path"
      : "id, slug, content, content_path, metadata";
    const { data: items, error: fetchErr } = await sb.from(table).select(sel).in("slug", slugs);
    if (fetchErr) return { error: fetchErr.message };
    let judged = 0;
    let failed = 0;
    for (const item of items || []) {
      try {
        let body = kind === "skill" ? item.skill_md_content : item.content;
        if (!body && item.content_path) body = await fetchContentByPath(item.content_path);
        if (!body) { failed++; continue; }
        const meta = item.metadata || {};
        const name = kind === "skill"
          ? item.name
          : (meta.author && meta.repo ? `${meta.author}/${meta.repo}` : item.slug);
        await judgeQualityInline(sb, kind, item.slug, body, name);
        judged++;
      } catch (e) {
        failed++;
        console.warn(`[admin force-quality] ${item.slug}: ${e.message}`);
      }
    }
    revalidatePath(`/admin/${kind === "claude_md" ? "claude-md" : "skills"}`);
    revalidatePath("/marketplace");
    return { ok: true, affected: judged, failed, action };
  } else {
    return { error: `Unknown action: ${action}` };
  }

  if (result.error) return { error: result.error.message };
  revalidatePath(`/admin/${kind === "claude_md" ? "claude-md" : "skills"}`);
  revalidatePath("/marketplace");
  return { ok: true, affected: slugs.length, action };
}

/* -------------------------------------------------------------------- */
/* Bench cycles                                                          */
/* -------------------------------------------------------------------- */

/**
 * Reset all errored jobs of a cycle back to queued so the next bench run
 * picks them up. Used when a cycle aborted mid-run from a transient quota.
 */
export async function retryErroredJobs(formData) {
  const cycleId = parseInt(String(formData.get("cycle_id") || ""), 10);
  if (!Number.isFinite(cycleId)) return { error: "Invalid cycle_id" };
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const { error, count } = await sb
    .from("run_jobs")
    .update({ status: "queued", error_message: null }, { count: "exact" })
    .eq("cycle_id", cycleId)
    .eq("status", "error");
  if (error) return { error: error.message };
  revalidatePath("/admin/cycles");
  return { ok: true, requeued: count || 0 };
}

/**
 * Mark a cycle as completed when all its jobs are done/cached but the
 * orchestrator never flipped the status (most common reason: bench script
 * crashed at the very end). Idempotent.
 */
export async function markCycleCompleted(formData) {
  const cycleId = parseInt(String(formData.get("cycle_id") || ""), 10);
  if (!Number.isFinite(cycleId)) return { error: "Invalid cycle_id" };
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  // Only flip if all jobs are done/cached (safety check).
  const { count: pending } = await sb
    .from("run_jobs")
    .select("*", { count: "exact", head: true })
    .eq("cycle_id", cycleId)
    .not("status", "in", "(completed,cached,error)");
  if ((pending || 0) > 0) {
    return { error: `Cycle has ${pending} jobs not yet done/cached/errored — refusing to mark completed.` };
  }
  const { error } = await sb
    .from("cycles")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", cycleId);
  if (error) return { error: error.message };
  revalidatePath("/admin/cycles");
  return { ok: true };
}

/**
 * Refresh the rankings materialised view / RPC. Useful after a cycle
 * completes, or after manual data fixes.
 */
export async function refreshRankings() {
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const { error } = await sb.rpc("refresh_rankings");
  if (error) return { error: error.message };
  revalidatePath("/leaderboard");
  revalidatePath("/marketplace");
  revalidatePath("/admin/cycles");
  return { ok: true };
}

/**
 * Reopen a cycle that was halted as 'partial' (budget exhausted) so the
 * next bench run picks it up. Flips status to 'queued' — the orchestrator
 * resumes by FIFO. The operator should bump BENCH_BUDGET_USD before re-running.
 */
export async function reopenPartialCycle(formData) {
  const cycleId = parseInt(String(formData.get("cycle_id") || ""), 10);
  if (!Number.isFinite(cycleId)) return { error: "Invalid cycle_id" };
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const { error } = await sb
    .from("cycles")
    .update({ status: "queued", completed_at: null })
    .eq("id", cycleId)
    .eq("status", "partial");
  if (error) return { error: error.message };
  revalidatePath("/admin/cycles");
  return { ok: true };
}

/* -------------------------------------------------------------------- */
/* Subscribers (RGPD)                                                    */
/* -------------------------------------------------------------------- */

/**
 * Mark a subscriber as unsubscribed (sets `unsubscribed_at = now`).
 * RGPD-friendly : we don't actually DELETE the row so we can prove the
 * unsubscribe happened (audit trail). Use `deleteSubscriber` for full erasure
 * (right-to-be-forgotten request).
 */
export async function unsubscribeUser(formData) {
  const email = String(formData.get("email") || "").toLowerCase();
  if (!email) return { error: "Missing email" };
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const { error } = await sb
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email);
  if (error) return { error: error.message };
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

/**
 * RGPD right-to-be-forgotten : full delete of the subscriber row + all PII.
 * Irreversible. Use only when explicitly requested by the user (or by you
 * cleaning up bounce-list / spam).
 */
export async function deleteSubscriber(formData) {
  const email = String(formData.get("email") || "").toLowerCase();
  if (!email) return { error: "Missing email" };
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const { error } = await sb.from("subscribers").delete().eq("email", email);
  if (error) return { error: error.message };
  revalidatePath("/admin/subscribers");
  return { ok: true };
}

/**
 * Sweep stuck queued jobs older than N hours back to error so the cycle
 * can finish. Default 24h. Use when stripe listen / dev was off and a
 * cycle started but never progressed.
 */
export async function sweepStuckJobs(formData) {
  const hours = parseInt(String(formData.get("hours") || "24"), 10);
  const guard = await adminGuard();
  if (guard.error) return guard;
  const { sb } = guard;
  const cutoffIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { error, count } = await sb
    .from("run_jobs")
    .update(
      { status: "error", error_message: `swept by admin: queued > ${hours}h` },
      { count: "exact" }
    )
    .eq("status", "queued")
    .lt("queued_at", cutoffIso);
  if (error) return { error: error.message };
  revalidatePath("/admin/cycles");
  return { ok: true, swept: count || 0 };
}
