import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import { getSkill, getClaudeMd, apiBase } from "../api.js";
import { emberGradient } from "../ui/logo.js";

/**
 * `npx versuz battle <a> vs <b>` — head-to-head terminal viz of two
 * benched skills (or CLAUDE.md). Used in social videos : 20-second
 * screencast showing rank/score/judge consensus + animated reveal of
 * the winner.
 *
 * Examples :
 *   versuz battle pdf-generator vs anthropic-pdf
 *   versuz battle nextjs-supabase nextjs-prisma
 *   versuz battle anthropics-claude-code-best-practices vs simonw-claude-best-practices --kind=claude-md
 */
export async function cmdBattle(args) {
  const tokens = (args._ || []).slice(1).filter((t) => t !== "vs");
  if (tokens.length < 2) {
    console.log(chalk.yellow("Usage : versuz battle <slug-a> [vs] <slug-b> [--kind=skill|claude-md]"));
    process.exit(2);
  }
  const [slugA, slugB] = tokens;
  const kind = args.kind === "claude_md" || args.kind === "claude-md" ? "claude-md" : "skill";

  const spinner = ora({
    text: `Loading fighters from ${apiBase()}…`,
    color: "cyan",
  }).start();

  let a, b;
  try {
    const fetcher = kind === "claude-md" ? getClaudeMd : getSkill;
    [a, b] = await Promise.all([fetcher(slugA), fetcher(slugB)]);
  } catch (err) {
    spinner.fail(chalk.red(`Lookup failed : ${err.message}`));
    process.exit(1);
  }
  spinner.stop();

  if (!a || !b) {
    console.error(chalk.red("One or both fighters not found."));
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────────
  // Render — two columns side by side, ASCII separator, reveal sequence
  // ──────────────────────────────────────────────────────────────────
  const COL = 36;
  const pad = (s, w) => {
    const txt = String(s ?? "—");
    if (txt.length >= w) return txt.slice(0, w);
    return txt + " ".repeat(w - txt.length);
  };

  const name = (item) =>
    item.name || (item.author && item.repo ? `${item.author}/${item.repo}` : item.slug);

  const score = (item) =>
    item.elo != null ? Number(item.elo).toFixed(1) : item.prior != null ? `~${item.prior}` : "—";

  const scoreLabel = (item) => (item.elo != null ? "ELO" : "PRIOR");

  const stars = (item) => (item.stars != null ? `★ ${item.stars.toLocaleString("en-US")}` : "★ —");

  const cat = (item) => item.category || item.project_category || "—";

  console.log("");
  console.log("  " + emberGradient("◆") + chalk.bold.white("  VERSUZ · BATTLE\n"));

  // Header row
  console.log(
    "  " +
      chalk.bgRed.white.bold(pad(` ${name(a)} `, COL)) +
      "  vs  " +
      chalk.bgBlue.white.bold(pad(` ${name(b)} `, COL))
  );

  // Spacer
  console.log("");

  // Stats rows
  const rows = [
    ["category",   cat(a),                cat(b)],
    ["github",     stars(a),              stars(b)],
    ["tier",       (a.tier || "free").toUpperCase(), (b.tier || "free").toUpperCase()],
  ];

  for (const [label, va, vb] of rows) {
    console.log(
      "  " +
        chalk.dim(pad(label, 10)) +
        chalk.white(pad(va, COL - 10)) +
        chalk.dim("  │  ") +
        chalk.dim(pad(label, 10)) +
        chalk.white(pad(vb, COL - 10))
    );
  }

  // Score reveal (the dramatic line)
  console.log("");
  console.log(
    "  " +
      chalk.dim(pad(scoreLabel(a), 10)) +
      emberGradient(pad(score(a), COL - 10)) +
      chalk.dim("  │  ") +
      chalk.dim(pad(scoreLabel(b), 10)) +
      emberGradient(pad(score(b), COL - 10))
  );

  // Verdict
  console.log("");
  const aScore = Number(a.elo ?? a.prior ?? 0);
  const bScore = Number(b.elo ?? b.prior ?? 0);
  let winner = null;
  if (aScore > bScore) winner = a;
  else if (bScore > aScore) winner = b;

  const verdictBox = winner
    ? `${chalk.bold("WINNER")}    ${emberGradient(name(winner))}\n\n` +
      chalk.dim(`margin    `) + chalk.white(`${Math.abs(aScore - bScore).toFixed(2)} ${scoreLabel(winner)}`) + `\n` +
      chalk.dim(`install   `) + chalk.cyan(`npx versuz install ${winner.slug}${kind === "claude-md" ? " --kind=claude-md" : ""}`)
    : `${chalk.bold.yellow("DRAW")}     scores are identical (${aScore.toFixed(2)})`;

  console.log(boxen(verdictBox, {
    padding: 1,
    borderStyle: "round",
    borderColor: winner ? "yellow" : "gray",
    margin: { left: 2, right: 0, top: 0, bottom: 1 },
  }));

  // Bench transparency footer
  if (a.elo == null && b.elo == null) {
    console.log(chalk.dim("  Neither skill has been benched yet — scores are PRIOR (star-based)."));
  } else if (a.elo == null || b.elo == null) {
    console.log(chalk.dim("  One skill hasn't been benched yet. Cross-comparing PRIOR vs ELO is approximate."));
  } else {
    console.log(chalk.dim("  Both skills benched on the same 30-task suite, judged by 3 frontier models."));
  }
  console.log("");
}
