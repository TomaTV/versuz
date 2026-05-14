// API client : default versuz.dev (live since 2026-05). Override via :
//   VERSUZ_API=http://localhost:3000 npx versuz ...   # for dev
//   ou flag --api=http://localhost:3000
let overrideBase = null;
export function setApiBase(url) {
  if (url) overrideBase = url.replace(/\/$/, "");
}
const DEFAULT_BASE = process.env.VERSUZ_API || "https://versuz.dev";

export function apiBase() {
  return (overrideBase || DEFAULT_BASE).replace(/\/$/, "");
}

async function getJson(path, params = {}) {
  const url = new URL(`${apiBase()}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "versuz-cli/0.1.0" },
    });
  } catch (netErr) {
    // Network-level failure (DNS, refused, timeout) — donner un message clair
    const err = new Error(
      `Cannot reach ${apiBase()} (${netErr.message || "network error"}). ` +
        `Set VERSUZ_API=<url> or use --api=<url> to point to your server.`
    );
    err.status = 0;
    err.cause = netErr;
    throw err;
  }
  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      // ignore — body might be non-JSON for some errors
    }
    const err = new Error(
      body?.error || `${res.status} ${res.statusText} on ${url.pathname}`
    );
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

export async function listSkills({ q, category, tier, limit = 50, page = 1, sort } = {}) {
  return getJson("/api/v1/skills", { q, category, tier, limit, page, sort });
}

export async function listClaudeMds({ q, category, tier, limit = 50, page = 1, sort } = {}) {
  return getJson("/api/v1/claude-md", { q, category, tier, limit, page, sort });
}

export async function getSkill(slug) {
  return getJson(`/api/v1/skills/${encodeURIComponent(slug)}`);
}

export async function getClaudeMd(slug) {
  return getJson(`/api/v1/claude-md/${encodeURIComponent(slug)}`);
}

export async function getSkillContent(slug) {
  return getJson(`/api/v1/skills/${encodeURIComponent(slug)}/content`);
}

export async function getClaudeMdContent(slug) {
  return getJson(`/api/v1/claude-md/${encodeURIComponent(slug)}/content`);
}

// Authenticated POSTs : Bearer <github-pat>
async function postJson(path, body, { token } = {}) {
  const url = `${apiBase()}${path}`;
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "versuz-cli/0.1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : "{}",
    });
  } catch (netErr) {
    const err = new Error(
      `Cannot reach ${apiBase()} (${netErr.message || "network error"}). Set VERSUZ_API=<url> or use --api=<url>.`
    );
    err.status = 0;
    throw err;
  }
  let payload = null;
  try { payload = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(payload?.error || `${res.status} ${res.statusText} on ${path}`);
    err.status = res.status;
    err.body = payload;
    throw err;
  }
  return payload;
}

export async function whoami(token) {
  return postJson("/api/v1/auth/whoami", null, { token });
}

export async function submit({ token, kind, url, content }) {
  return postJson("/api/v1/submit", { kind, url, content }, { token });
}
