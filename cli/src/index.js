import chalk from "chalk";
import prompts from "prompts";
import { printLogo, printMiniLogo, emberGradient } from "./ui/logo.js";
import { cmdList } from "./commands/list.js";
import { cmdSearch } from "./commands/search.js";
import { cmdInfo } from "./commands/info.js";
import { cmdInstall } from "./commands/install.js";
import { cmdLogin } from "./commands/login.js";
import { cmdLogout } from "./commands/logout.js";
import { cmdWhoami } from "./commands/whoami.js";
import { cmdSubmit } from "./commands/submit.js";
import { cmdBattle } from "./commands/battle.js";
import { apiBase, setApiBase } from "./api.js";

/**
 * Parse argv into { command, _, flags } shape.
 *   versuz install foo --kind=claude-md
 *   → { _: ["install", "foo"], kind: "claude-md" }
 */
function parseArgs(argv) {
  const args = { _: [] };
  for (const tok of argv) {
    if (tok.startsWith("--")) {
      const [k, v] = tok.slice(2).split("=");
      args[k] = v == null ? true : v;
    } else if (tok.startsWith("-") && tok.length === 2) {
      args[tok.slice(1)] = true;
    } else {
      args._.push(tok);
    }
  }
  return args;
}

const HELP = `
${chalk.bold.white("  COMMANDS")}  ${chalk.dim("─".repeat(60))}

  ${chalk.cyan("versuz")}                          ${chalk.dim("interactive mode (prompts)")}
  ${chalk.cyan("versuz list")} ${chalk.dim("[--kind=skill|claude-md] [--category=<id>]")}
                                  ${chalk.dim("[--tier=free|premium|featured] [--q=<query>]")}
  ${chalk.cyan("versuz search")} ${chalk.yellow("<query>")}             ${chalk.dim("cross-kind full-text search")}
  ${chalk.cyan("versuz info")} ${chalk.yellow("<slug>")} ${chalk.dim("[--kind=claude-md]")}     ${chalk.dim("show full details")}
  ${chalk.cyan("versuz install")} ${chalk.yellow("<slug>")} ${chalk.dim("[--kind=claude-md]")}  ${chalk.dim("download to current project")}
  ${chalk.cyan("versuz battle")} ${chalk.yellow("<a> vs <b>")} ${chalk.dim("[--kind=claude-md]")}  ${chalk.dim("head-to-head terminal viz")}

${chalk.bold.white("  PUBLISH")}   ${chalk.dim("─".repeat(60))}

  ${chalk.cyan("versuz login")}                    ${chalk.dim("authenticate with GitHub PAT (anti-spam)")}
  ${chalk.cyan("versuz whoami")}                   ${chalk.dim("show current account")}
  ${chalk.cyan("versuz logout")}                   ${chalk.dim("clear local auth")}
  ${chalk.cyan("versuz submit")} ${chalk.yellow("<github-url>")} ${chalk.dim("[--kind=claude-md]")}
                                  ${chalk.dim("share a skill/CLAUDE.md from a repo you own")}
                                  ${chalk.dim("(or an org you're a member of · free · 5/h cap)")}

${chalk.bold.white("  OPTIONS")}   ${chalk.dim("─".repeat(60))}

  ${chalk.cyan("--api=<url>")}      ${chalk.dim("override API host (or set VERSUZ_API env var)")}
  ${chalk.cyan("--help")}, ${chalk.cyan("-h")}      ${chalk.dim("show this help")}
  ${chalk.cyan("--version")}, ${chalk.cyan("-v")}   ${chalk.dim("show version")}

${chalk.bold.white("  LINKS")}     ${chalk.dim("─".repeat(60))}

  Marketplace   ${chalk.blueBright.underline("https://versuz.dev/marketplace")}
  Submit yours  ${chalk.blueBright.underline("https://versuz.dev/submit")}
  Source        ${chalk.blueBright.underline("https://github.com/versuz/versuz")}
`;

async function interactive() {
  printLogo();
  console.log(chalk.dim(`  api: ${apiBase()}\n`));
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: chalk.bold("What do you want to do?"),
    choices: [
      { title: `${chalk.cyan(">")} Search the marketplace`, value: "search", description: "full-text across skills + CLAUDE.md" },
      { title: `${chalk.cyan(">")} Browse skills`, value: "list-skill", description: "table view, sorted by prior" },
      { title: `${chalk.cyan(">")} Browse CLAUDE.md files`, value: "list-claude-md", description: "project-context files" },
      { title: `${chalk.cyan(">")} Install by slug`, value: "install", description: "download to current project" },
      { title: `${chalk.cyan(">")} View item details`, value: "info", description: "elo, prior, license, github" },
      { title: `${chalk.cyan(">")} Submit your skill / CLAUDE.md`, value: "submit", description: "share your own (requires GitHub login)" },
      { title: chalk.dim("  Cancel"), value: null },
    ],
    initial: 0,
    hint: " ",
  });
  if (!action) return;

  if (action === "search") {
    const { q } = await prompts({
      type: "text",
      name: "q",
      message: "Search for…",
      validate: (v) => (v && v.length >= 2 ? true : "min 2 chars"),
    });
    if (q) await cmdSearch({ q });
    return;
  }
  if (action === "list-skill") {
    await cmdList({ kind: "skill" });
    return;
  }
  if (action === "list-claude-md") {
    await cmdList({ kind: "claude-md" });
    return;
  }
  if (action === "submit") {
    await cmdSubmit({});
    return;
  }
  if (action === "install" || action === "info") {
    const { kind } = await prompts({
      type: "select",
      name: "kind",
      message: "Type",
      choices: [
        { title: "Skill", value: "skill" },
        { title: "CLAUDE.md", value: "claude-md" },
      ],
      initial: 0,
    });
    const { slug } = await prompts({
      type: "text",
      name: "slug",
      message: "Slug",
      validate: (v) => (v && v.length >= 2 ? true : "min 2 chars"),
    });
    if (!slug) return;
    if (action === "install") await cmdInstall({ slug, kind });
    else await cmdInfo({ slug, kind });
  }
}

export async function run(argv) {
  const args = parseArgs(argv);
  if (args.api) setApiBase(args.api);
  const cmd = args._[0];

  if (args.help || args.h || cmd === "help") {
    printLogo();
    console.log(HELP);
    return;
  }

  if (args.version || args.v || cmd === "version") {
    console.log(`${emberGradient("versuz")} ${chalk.dim("0.2.0")}`);
    console.log(chalk.dim(`api: ${apiBase()}`));
    return;
  }

  switch (cmd) {
    case "list":
    case "ls":
      return cmdList(args);
    case "search":
    case "find":
      return cmdSearch(args);
    case "info":
    case "show":
      return cmdInfo(args);
    case "install":
    case "add":
    case "i":
      return cmdInstall(args);
    case "login":
      return cmdLogin(args);
    case "logout":
      return cmdLogout(args);
    case "whoami":
      return cmdWhoami(args);
    case "submit":
    case "publish":
      return cmdSubmit(args);
    case "battle":
    case "duel":
    case "vs":
      return cmdBattle(args);
    case undefined:
      return interactive();
    default:
      console.error(chalk.red(`Unknown command: ${cmd}`));
      console.log(HELP);
      process.exit(2);
  }
}
