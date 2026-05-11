import ora from "ora";
import chalk from "chalk";
import { listSkills, listClaudeMds } from "../api.js";
import { renderSkillsTable, renderClaudeMdTable } from "../ui/table.js";

export async function cmdSearch(args) {
  const q = args.q || args._?.[1];
  if (!q) {
    console.error(chalk.red("Missing query. Usage: versuz search <query>"));
    process.exit(2);
  }
  const spinner = ora({ text: `Searching for "${q}"…`, color: "cyan" }).start();
  try {
    const [skillRes, claudeRes] = await Promise.all([
      listSkills({ q, limit: 15 }),
      listClaudeMds({ q, limit: 15 }),
    ]);
    spinner.succeed(
      chalk.green(
        `${skillRes.items?.length || 0} skill(s) + ${claudeRes.items?.length || 0} CLAUDE.md found`
      )
    );
    if (skillRes.items?.length) {
      console.log(chalk.bold.cyan("\n  SKILLS\n"));
      renderSkillsTable(skillRes.items);
    }
    if (claudeRes.items?.length) {
      console.log(chalk.bold.green("\n  CLAUDE.md\n"));
      renderClaudeMdTable(claudeRes.items);
    }
    if (!skillRes.items?.length && !claudeRes.items?.length) {
      console.log(chalk.dim("\n  No matches. Try a different query."));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Search failed : ${err.message}`));
    throw err;
  }
}
