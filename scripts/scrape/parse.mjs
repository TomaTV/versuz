/**
 * Parse a SKILL.md file.
 *
 * SKILL.md format (Anthropic-spec, May 2026):
 *
 *   ---
 *   name: pdf-extract
 *   description: Extract text and tables from PDFs
 *   tools: ["bash", "read", "write"]
 *   model: claude-opus-4-7
 *   ---
 *
 *   # System prompt body
 *
 *   You are an expert in PDF extraction…
 *
 * Returns a normalised object. Robust to missing/extra fields.
 */

import matter from "gray-matter";

export function parseSkillMd(raw) {
  let parsed;
  try {
    parsed = matter(raw);
  } catch (err) {
    return {
      ok: false,
      error: `frontmatter parse failed: ${err.message}`,
    };
  }

  const fm = parsed.data || {};
  const body = (parsed.content || "").trim();

  if (!fm.name && !inferNameFromBody(body)) {
    return { ok: false, error: "missing `name` in frontmatter and no H1 in body" };
  }

  return {
    ok: true,
    name: String(fm.name || inferNameFromBody(body)).trim(),
    description: String(fm.description || firstParagraph(body) || "").trim(),
    tools: Array.isArray(fm.tools) ? fm.tools : [],
    model: fm.model ? String(fm.model) : null,
    license: fm.license ? String(fm.license) : null,
    metadata: fm,
    body,
  };
}

function inferNameFromBody(body) {
  const m = body.match(/^#\s+([^\n]+)/m);
  return m ? m[1].trim() : null;
}

function firstParagraph(body) {
  // Strip ALL leading markdown headings (## subheadings, ### etc.) AND
  // empty lines, then take the first real paragraph. The previous version
  // only stripped one heading, so files like "# Title\n## Identity\nfoo"
  // would surface "## Identity" as description (visible bug in marketplace).
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === "" || t.startsWith("#") || t.startsWith("---")) i += 1;
    else break;
  }
  const rest = lines.slice(i).join("\n").trim();
  const m = rest.match(/^([^\n]+(?:\n[^\n]+)*)/);
  if (!m) return null;
  // Drop trailing markdown formatting markers, collapse whitespace
  return m[1]
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
