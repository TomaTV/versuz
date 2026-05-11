import chalk from "chalk";
import prompts from "prompts";
import ora from "ora";
import boxen from "boxen";
import { whoami } from "../api.js";
import { writeAuth, authPath } from "../auth.js";

const PAT_HELP = `${chalk.dim("Create one at")} ${chalk.blueBright("https://github.com/settings/tokens/new")}${chalk.dim(" — no scopes required, just `read:user`.")}`;

export async function cmdLogin(args) {
  const tokenFromFlag = args.token;

  let token = tokenFromFlag;
  if (!token) {
    console.log(boxen(
      `${chalk.bold("Sign in with GitHub")}\n\n` +
        `${chalk.dim("Versuz uses your GitHub identity to attribute submissions and")}\n` +
        `${chalk.dim("rate-limit anti-spam (5 submits/hour/user). The token never leaves")}\n` +
        `${chalk.dim("your machine for read commands — only sent on `versuz submit`.")}\n\n` +
        PAT_HELP,
      { padding: 1, borderStyle: "round", borderColor: "gray", margin: { top: 1, bottom: 1, left: 0, right: 0 } }
    ));
    const resp = await prompts({
      type: "password",
      name: "token",
      message: "GitHub PAT (ghp_…)",
      validate: (v) => (v && v.length >= 20 ? true : "looks too short"),
    });
    token = resp.token;
  }
  if (!token) {
    console.log(chalk.dim("  Aborted."));
    return;
  }

  const spinner = ora({ text: "Verifying token via GitHub…", color: "cyan" }).start();
  try {
    const data = await whoami(token);
    const u = data.user;
    spinner.succeed(chalk.green(`Signed in as ${chalk.bold(u.login)}`) + chalk.dim(`  (id ${u.id})`));
    const where = await writeAuth({ token, login: u.login, id: u.id, name: u.name });
    console.log(chalk.dim(`  Saved to ${where}`));
    console.log("");
    console.log(chalk.dim(`  → ${chalk.cyan("versuz submit <github-url>")}  to share a skill or CLAUDE.md`));
    console.log(chalk.dim(`  → ${chalk.cyan("versuz logout")}                to clear local auth`));
  } catch (err) {
    spinner.fail(chalk.red(`Login failed : ${err.message}`));
    if (err.status === 401) {
      console.log(chalk.dim(`\n  → Double-check the PAT. Required scope : ${chalk.cyan("read:user")} only.`));
    }
    process.exit(1);
  }
}
