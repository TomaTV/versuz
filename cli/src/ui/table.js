import Table from "cli-table3";
import chalk from "chalk";

function trunc(s, n) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function formatStars(n) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function tierBadge(tier) {
  if (tier === "premium") return chalk.bgYellow.black(" PREMIUM ");
  if (tier === "featured") return chalk.bgRed.white(" FEATURED ");
  return chalk.gray(" free ");
}

export function renderSkillsTable(items) {
  const table = new Table({
    head: [
      chalk.bold.dim("SLUG"),
      chalk.bold.dim("CATEGORY"),
      chalk.bold.dim("PRIOR"),
      chalk.bold.dim("★"),
      chalk.bold.dim("TIER"),
    ],
    style: { head: [], border: ["gray"] },
    colWidths: [38, 14, 8, 8, 12],
    wordWrap: true,
  });
  for (const item of items) {
    table.push([
      chalk.white(trunc(item.slug, 36)),
      chalk.cyan(item.category || "—"),
      chalk.yellow(item.prior ?? "—"),
      chalk.dim(formatStars(item.stars)),
      tierBadge(item.tier),
    ]);
  }
  console.log(table.toString());
}

export function renderClaudeMdTable(items) {
  const table = new Table({
    head: [
      chalk.bold.dim("SLUG"),
      chalk.bold.dim("CATEGORY"),
      chalk.bold.dim("TOKENS"),
      chalk.bold.dim("★"),
      chalk.bold.dim("TIER"),
    ],
    style: { head: [], border: ["gray"] },
    colWidths: [42, 14, 10, 8, 12],
    wordWrap: true,
  });
  for (const item of items) {
    const tokens = item.word_count ? Math.round(item.word_count * 1.3) : null;
    const tokensFmt = tokens
      ? tokens >= 1000
        ? `${(tokens / 1000).toFixed(1)}k`
        : String(tokens)
      : "—";
    table.push([
      chalk.white(trunc(item.slug, 40)),
      chalk.green(item.project_category || "—"),
      chalk.yellow(tokensFmt),
      chalk.dim(formatStars(item.stars)),
      tierBadge(item.tier),
    ]);
  }
  console.log(table.toString());
}
