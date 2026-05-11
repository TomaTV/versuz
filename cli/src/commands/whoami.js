import chalk from "chalk";
import boxen from "boxen";
import { readAuth, authPath } from "../auth.js";
import { whoami } from "../api.js";
import ora from "ora";

export async function cmdWhoami() {
  const cur = await readAuth();
  if (!cur) {
    console.log(chalk.dim("  Not signed in. Run `versuz login` to authenticate."));
    return;
  }
  const spinner = ora({ text: "Re-verifying token…", color: "cyan" }).start();
  try {
    const data = await whoami(cur.token);
    const u = data.user;
    spinner.succeed(chalk.green(`Verified — ${chalk.bold(u.login)}`));
    console.log(boxen(
      `${chalk.bold(u.name || u.login)}\n` +
        `${chalk.dim("login")}     ${chalk.cyan(u.login)}\n` +
        `${chalk.dim("id")}        ${u.id}\n` +
        `${chalk.dim("profile")}   ${chalk.blueBright(u.html_url)}\n` +
        `${chalk.dim("saved at")}  ${authPath()}`,
      { padding: 1, borderStyle: "round", borderColor: "gray", margin: { top: 1, bottom: 1, left: 0, right: 0 } }
    ));
  } catch (err) {
    spinner.fail(chalk.red(`Token rejected : ${err.message}`));
    if (err.status === 401) {
      console.log(chalk.dim(`  → Token may have been revoked. Run \`versuz login\` again.`));
    }
  }
}
