// POST /api/v1/auth/whoami
// Given a GitHub PAT in `Authorization: Bearer <token>`, calls GitHub /user
// to verify the token + returns the GH user info. Used by the CLI to
// confirm `versuz login` succeeded.
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return Response.json({ error: "Missing Bearer token" }, { status: 401 });
  }
  const token = m[1].trim();
  if (!token) {
    return Response.json({ error: "Empty token" }, { status: 401 });
  }
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "versuz-api/1.0",
    },
  });
  if (!res.ok) {
    return Response.json(
      { error: `GitHub rejected the token (${res.status})` },
      { status: 401 }
    );
  }
  const u = await res.json();
  return Response.json({
    api_version: "v1",
    user: {
      id: u.id,
      login: u.login,
      name: u.name,
      avatar_url: u.avatar_url,
      html_url: u.html_url,
    },
  });
}
