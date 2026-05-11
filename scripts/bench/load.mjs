/**
 * DB loaders that hydrate run_jobs with the actual content needed to run
 * the agent + judge them.
 */

export async function loadSubject(sb, job) {
  if (job.subject_kind === "skill" && job.skill_id) {
    const { data, error } = await sb
      .from("skills")
      .select("id, slug, name, skill_md_content")
      .eq("id", job.skill_id)
      .maybeSingle();
    if (error) throw error;
    return data
      ? {
          kind: "skill",
          id: data.id,
          slug: data.slug,
          name: data.name,
          content: data.skill_md_content || "",
        }
      : null;
  }
  if (job.subject_kind === "claude_md" && job.claude_md_id) {
    const { data, error } = await sb
      .from("claude_md_files")
      .select("id, slug, content, project_category, metadata")
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
      content: data.content || "",
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
