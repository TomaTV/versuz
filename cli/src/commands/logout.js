import chalk from "chalk";
import { clearAuth, readAuth } from "../auth.js";

export async function cmdLogout() {
  const cur = await readAuth();
  if (!cur) {
    console.log(chalk.dim("  Not signed in."));
    return;
  }
  const removed = await clearAuth();
  if (removed) {
    console.log(chalk.green(`  ✓ Signed out (was ${chalk.bold(cur.login)})`));
  } else {
    console.log(chalk.yellow("  Nothing to remove."));
  }
}
