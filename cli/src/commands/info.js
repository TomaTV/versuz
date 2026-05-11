import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import { getSkill, getClaudeMd } from "../api.js";

function field(label, value, color = chalk.white) {
  return `${chalk.dim(label.padEnd(14))} ${color(value || "—")}`;
}

export async function cmdInfo(args) {
  const slug = args.slug || args._?.[1];
  if (!slug) {
    console.error(chalk.red("Missing slug. Usage: versuz info <slug>"));
    process.exit(2);
  }
  const kind = args.kind || "skill";
  const spinner = ora({ text: `Fetching ${slug}…`, color: "cyan" }).start();
  try {
    const data = kind === "claude-md" ? await getClaudeMd(slug) : await getSkill(slug);
    const item = data.item;
    spinner.succeed(chalk.green(`Loaded ${item.slug}`));

    const tierColor =
      item.tier === "premium" ? chalk.yellow : item.tier === "featured" ? chalk.red : chalk.dim;

    const lines = [
      chalk.bold.white(item.name || item.slug),
      "",
      item.description ? chalk.dim(item.description) : "",
      "",
      field("Slug", item.slug, chalk.cyan),
      field("Category", item.category || item.project_category, chalk.cyan),
      field("Tier", item.tier, tierColor),
      ...(item.price_usd ? [field("Price", `$${item.price_usd}`, chalk.yellow)] : []),
      field("Prior", item.prior, chalk.yellow),
      field("Elo", item.elo ?? "—", chalk.yellow),
      field("Verification", `lvl ${item.verification_level ?? 0}`),
      field("Stars", item.stars),
      field("Forks", item.forks),
      field("License", item.license),
      field("GitHub", item.github_url, chalk.blueBright),
      ...(item.skill_type ? [field("Type", item.skill_type)] : []),
      ...(item.bundle_files?.length
        ? [field("Bundle", `${item.bundle_files.length} file(s)`)]
        : []),
    ].filter(Boolean);

    console.log(
      boxen(lines.join("\n"), {
        padding: 1,
        borderStyle: "round",
        borderColor: "gray",
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
      })
    );

    console.log(
      chalk.dim(
        `  → versuz install ${item.slug}${kind === "claude-md" ? " --kind=claude-md" : ""}`
      )
    );
  } catch (err) {
    spinner.fail(chalk.red(`Fetch failed : ${err.message}`));
    if (err.status === 404) {
      console.log(chalk.dim(`\n  → Try \`versuz search ${slug}\` to find the right slug.`));
    }
    throw err;
  }
}
