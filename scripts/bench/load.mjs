/**
 * DB loaders that hydrate run_jobs with the actual content needed to run
 * the agent + judge them.
 *
 * Post mig 0042 + R2 migration : inline column is NULL for 99% of rows ;
 * the content body lives in storage at `content_path`. We fetch from
 * whichever backend is active (R2 if R2_PUBLIC_URL env set, else Supabase).
 */

import { fetchContentByPath } from "../_storage.mjs";

async function resolveContent(row, inlineKey) {
  const inline = row[inlineKey];
  if (typeof inline === "string" && inline.length > 0) return inline;
  if (row.content_path) {
    const { text } = await fetchContentByPath(row.content_path, { timeoutMs: 15_000, maxTries: 3 });
    if (text) return text;
  }
  return "";
}

export async function loadSubject(sb, job) {
  if (job.subject_kind === "skill" && job.skill_id) {
    const { data, error } = await sb
      .from("skills")
      .select("id, slug, name, skill_md_content, content_path")
      .eq("id", job.skill_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      kind: "skill",
      id: data.id,
      slug: data.slug,
      name: data.name,
      content: await resolveContent(data, "skill_md_content"),
    };
  }
  if (job.subject_kind === "claude_md" && job.claude_md_id) {
    const { data, error } = await sb
      .from("claude_md_files")
      .select("id, slug, content, content_path, project_category, metadata")
      .eq("id", job.claude_md_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const meta = data.metadata || {};
    const display =
      meta.author && meta.repo ? `${meta.author}/${meta.repo}` : data.slug;
    return {
      kind: "claude_md",
      id: data.id,
      slug: data.slug,
      name: display,
      content: await resolveContent(data, "content"),
    };
  }
  return null;
}

export async function loadTask(sb, taskId) {
  const { data, error } = await sb
    .from("tasks")
    .select("id, slug, title, description, input_data, rubric, difficulty, category")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
