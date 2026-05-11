import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import fs from "node:fs/promises";
import path from "node:path";
import prompts from "prompts";
import { getSkillContent, getClaudeMdContent } from "../api.js";

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function confirmOverwrite(filePath) {
  if (!(await pathExists(filePath))) return true;
  const resp = await prompts({
    type: "confirm",
    name: "ok",
    message: `${chalk.yellow(filePath)} already exists. Overwrite?`,
    initial: false,
  });
  return resp.ok === true;
}

export async function cmdInstall(args) {
  const slug = args.slug || args._?.[1];
  if (!slug) {
    console.error(chalk.red("Missing slug. Usage: versuz install <slug>"));
    process.exit(2);
  }
  const kind = args.kind || "skill";
  const cwd = process.cwd();

  const spinner = ora({ text: `Fetching ${slug}…`, color: "cyan" }).start();
  let payload;
  try {
    payload =
      kind === "claude-md"
        ? await getClaudeMdContent(slug)
        : await getSkillContent(slug);
    spinner.succeed(chalk.green(`Content fetched from versuz.dev`));
  } catch (err) {
    spinner.fail(chalk.red(`Fetch failed : ${err.message}`));
    if (err.status === 402) {
      console.log(
        boxen(
          chalk.yellow("This is a premium item.\n\n") +
            chalk.white(`Purchase first :\n  ${chalk.blueBright(err.body?.buy_url || `https://versuz.dev/buy/${kind === "claude-md" ? "claude_md" : "skill"}/${slug}`)}`),
          { padding: 1, borderStyle: "round", borderColor: "yellow" }
        )
      );
    }
    if (err.status === 404) {
      console.log(chalk.dim(`\n  → Try \`versuz search ${slug}\` first.`));
    }
    process.exit(1);
  }

  // Install paths :
  //   skill     → .claude/skills/<slug>/SKILL.md
  //   claude-md → ./CLAUDE.md (at repo root) — confirm overwrite if exists
  if (kind === "claude-md") {
    const target = path.join(cwd, "CLAUDE.md");
    if (!(await confirmOverwrite(target))) {
      console.log(chalk.dim("  Aborted."));
      return;
    }
    await fs.writeFile(target, payload.content, "utf8");
    console.log(
      boxen(
        chalk.green(`✓ Wrote CLAUDE.md `) + chalk.dim(`(${payload.content.length} chars)`),
        { padding: 1, borderStyle: "round", borderColor: "green" }
      )
    );
  } else {
    const dir = path.join(cwd, ".claude", "skills", slug);
    await ensureDir(dir);
    const skillMdPath = path.join(dir, "SKILL.md");
    if (!(await confirmOverwrite(skillMdPath))) {
      console.log(chalk.dim("  Aborted."));
      return;
    }
    await fs.writeFile(skillMdPath, payload.content, "utf8");
    const bundleCount = (payload.bundle_files || []).length;
    const bundleNote =
      bundleCount > 0
        ? chalk.yellow(
            `\n  Note : this skill has ${bundleCount} bundle file(s) (assets, scripts, etc.).` +
              `\n  Bundle download via CLI n'est pas encore implementé — clone le repo depuis :` +
              `\n  ${chalk.blueBright(payload.github_url || "github.com")}`
          )
        : "";
    console.log(
      boxen(
        chalk.green(`✓ Wrote ${path.relative(cwd, skillMdPath)} `) +
          chalk.dim(`(${payload.content.length} chars)`) +
          bundleNote,
        { padding: 1, borderStyle: "round", borderColor: "green" }
      )
    );
  }

  console.log(
    chalk.dim(
      `  Source : ${chalk.blueBright(payload.github_url || "—")}\n` +
        `  Slug   : ${payload.slug}\n`
    )
  );
}
