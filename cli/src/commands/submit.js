import chalk from "chalk";
import boxen from "boxen";
import ora from "ora";
import prompts from "prompts";
import { readAuth } from "../auth.js";
import { submit, apiBase } from "../api.js";

export async function cmdSubmit(args) {
  const auth = await readAuth();
  if (!auth) {
    console.log(boxen(
      chalk.yellow("Not signed in.") + "\n\n" +
        chalk.white("Submissions require a GitHub account (anti-spam).\n") +
        chalk.dim("Run ") + chalk.cyan("versuz login") + chalk.dim(" first."),
      { padding: 1, borderStyle: "round", borderColor: "yellow" }
    ));
    process.exit(1);
  }

  // Submit URL-only : tu peux soumettre uniquement TES propres repos (perso
  // ou orgs dont tu es membre). Pousse ton SKILL.md sur GitHub d'abord.
  let url = args.url || args._?.[1];
  let kind = args.kind === "claude_md" || args.kind === "claude-md" ? "claude_md" : "skill";

  if (!url) {
    const resp = await prompts([
      {
        type: "select",
        name: "kind",
        message: "Kind",
        choices: [
          { title: "Skill (SKILL.md)", value: "skill" },
          { title: "CLAUDE.md", value: "claude_md" },
        ],
        initial: kind === "claude_md" ? 1 : 0,
      },
      {
        type: "text",
        name: "url",
        message: `GitHub URL on your own repo (signed in as ${chalk.cyan(auth.login)})`,
        validate: (v) =>
          /github\.com/.test(v) ? true : "must be a github.com URL on your account",
      },
    ]);
    if (!resp.kind || !resp.url) {
      console.log(chalk.dim("  Aborted."));
      return;
    }
    kind = resp.kind;
    url = resp.url;
  }

  const spinner = ora({
    text: `Submitting to ${apiBase()}…`,
    color: "cyan",
  }).start();

  try {
    const res = await submit({ token: auth.token, kind, url });
    spinner.succeed(chalk.green(`Submitted as ${chalk.bold(res.slug)}`));
    const viaLabel =
      res.via === "org_member"
        ? chalk.green(`✓ Verified via org membership (lvl ${res.verification_level})`)
        : chalk.green(`✓ Verified as repo owner (lvl ${res.verification_level})`);
    console.log(boxen(
      `${chalk.bold("✓ Listed")}\n\n` +
        `${chalk.dim("slug")}      ${chalk.cyan(res.slug)}\n` +
        `${chalk.dim("kind")}      ${kind}\n` +
        `${chalk.dim("view")}      ${chalk.blueBright(res.view_url)}\n\n` +
        viaLabel,
      { padding: 1, borderStyle: "round", borderColor: "green", margin: { top: 1, bottom: 1, left: 0, right: 0 } }
    ));
  } catch (err) {
    spinner.fail(chalk.red(`Submit failed : ${err.message}`));
    if (err.status === 401) {
      console.log(chalk.dim(`  → Token rejected. Run \`versuz login\` again.`));
    } else if (err.status === 403) {
      console.log(chalk.yellow(`  → You can only submit repos you own or are a member of.`));
      if (err.body?.hint) console.log(chalk.dim(`  → ${err.body.hint}`));
    } else if (err.status === 429) {
      console.log(chalk.yellow(`  → Rate limit hit (5/hour). Wait a bit then retry.`));
    } else if (err.status === 409) {
      console.log(chalk.yellow(`  → Same URL was already submitted in the last 24h.`));
    } else if (err.status === 400 && err.body?.error?.includes("parse")) {
      console.log(chalk.dim(`  → SKILL.md must have valid frontmatter (name, description).`));
    }
    process.exit(1);
  }
}
