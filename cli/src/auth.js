// Auth storage : ~/.versuz/auth.json (chmod 600 sur Unix).
// Garde le GH PAT + le login pour les commandes authentifiées.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function authDir() {
  return path.join(os.homedir(), ".versuz");
}
function authFile() {
  return path.join(authDir(), "auth.json");
}

export async function readAuth() {
  try {
    const buf = await fs.readFile(authFile(), "utf8");
    const data = JSON.parse(buf);
    if (!data?.token || !data?.login) return null;
    return data;
  } catch {
    return null;
  }
}

export async function writeAuth({ token, login, id, name }) {
  await fs.mkdir(authDir(), { recursive: true });
  const payload = { token, login, id, name, saved_at: new Date().toISOString() };
  await fs.writeFile(authFile(), JSON.stringify(payload, null, 2), { encoding: "utf8", mode: 0o600 });
  // Best-effort chmod sur Unix (no-op sur Windows)
  try { await fs.chmod(authFile(), 0o600); } catch {}
  return authFile();
}

export async function clearAuth() {
  try {
    await fs.unlink(authFile());
    return true;
  } catch {
    return false;
  }
}

export function authPath() {
  return authFile();
}
