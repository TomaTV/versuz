import figlet from "figlet";
import gradient from "gradient-string";
import chalk from "chalk";
import boxen from "boxen";

// Palette ember Versuz : ink → ember → bone
const emberPalette = ["#1a1a1a", "#8B2A0E", "#C8401A", "#E8743F", "#F1ECDF"];
const emberGradient = gradient(emberPalette);
const azureGradient = gradient(["#1a1a1a", "#1E40AF", "#3B82F6", "#93C5FD"]);

function ascii(text, font = "ANSI Shadow") {
  return figlet.textSync(text, {
    font,
    horizontalLayout: "default",
    verticalLayout: "default",
    width: 80,
    whitespaceBreak: true,
  });
}

export function printLogo() {
  // Big ASCII title in ember gradient
  const title = ascii("VERSUZ", "ANSI Shadow");
  const colored = emberGradient.multiline(title);

  const tagline = chalk.bold.white("the marketplace for Claude skills");
  const subtagline = chalk.dim("· skills · CLAUDE.md · benchmark · " + chalk.cyan("versuz.dev") + " ·");

  console.log("");
  console.log(colored);
  console.log("");
  // Centered-ish tagline
  console.log("  " + tagline);
  console.log("  " + subtagline);
  console.log("");
}

export function printMiniLogo() {
  // Compact one-liner for non-interactive commands
  const headline = emberGradient(chalk.bold("◢◤ VERSUZ"));
  console.log("");
  console.log(`  ${headline} ${chalk.dim("· versuz.dev")}`);
  console.log("");
}

export function printSection(label, color = chalk.cyan) {
  // Section divider for command output
  const bar = chalk.dim("─".repeat(2));
  console.log("");
  console.log(`  ${color.bold(label.toUpperCase())}  ${bar}`);
  console.log("");
}

export function printDivider() {
  console.log(chalk.dim("  " + "─".repeat(70)));
}

export { emberGradient, azureGradient, ascii };
