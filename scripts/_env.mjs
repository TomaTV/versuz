/**
 * Loads .env.local for standalone Node scripts.
 *
 * Next.js loads .env.local automatically for the dev server / build, but
 * `node scripts/...` does not. Import this at the very top of any entry
 * script so process.env is populated before anything else runs.
 *
 *   import "../_env.mjs";  // first import in entry script
 */

import { config } from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(__dirname, "..", ".env.local"),
  path.join(process.cwd(), ".env.local"),
];

for (const p of candidates) {
  if (existsSync(p)) {
    config({ path: p, quiet: true });
    break;
  }
}
