import ora from "ora";
import chalk from "chalk";
import { listSkills, listClaudeMds } from "../api.js";
import { renderSkillsTable, renderClaudeMdTable } from "../ui/table.js";

export async function cmdList(args) {
  const kind = args.kind || "skill";
  const filters = {
    q: args.q,
    category: args.category,
    tier: args.tier,
    limit: args.limit || 30,
    sort: args.sort,
  };
  const spinner = ora({
    text: `Loading ${kind === "claude-md" ? "CLAUDE.md" : "skills"}…`,
    color: "cyan",
  }).start();
  try {
    const data =
      kind === "claude-md"
        ? await listClaudeMds(filters)
        : await listSkills(filters);
    const items = data.items || [];
    spinner.succeed(
      chalk.green(`${items.length} item(s) loaded`) +
        chalk.dim(` · total ${data.total ?? "?"}`)
    );
    if (items.length === 0) {
      console.log(chalk.dim("\n  No results match the filters."));
      return;
    }
    if (kind === "claude-md") renderClaudeMdTable(items);
    else renderSkillsTable(items);
    console.log(
      chalk.dim(
        `\n  → versuz info <slug>     view details` +
          `\n  → versuz install <slug>  download to current project`
      )
    );
  } catch (err) {
    spinner.fail(chalk.red(`Load failed : ${err.message}`));
    throw err;
  }
}
