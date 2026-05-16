export const metadata = {
  title: "Building a CLI nobody asked for",
  excerpt:
    "Versuz has a web app, an MCP server, and an API. The CLI was the part I almost cut. It turned out to be the most-used surface — here's why, and what shipping `npx versuz` taught me about distribution.",
  dateISO: "2026-05-10",
  tags: ["product", "cli"],
  author: "Toma",
};

export function Body() {
  return (
    <>
      <p>
        Versuz has four interfaces : a web app, a JSON API, an MCP server,
        and a CLI. The CLI was the last one I built and the first one I
        almost cut. &ldquo;Who installs a CLI for a marketplace ?&rdquo; I
        kept asking myself. &ldquo;Just use the website.&rdquo;
      </p>

      <p>
        Three weeks after launch, the CLI is the surface with the highest
        retention. Here&apos;s why I was wrong, and what I learned shipping{" "}
        <code>npx versuz</code>.
      </p>

      <h2>The pitch in 7 lines</h2>

      <pre>
{`$ npx versuz search pdf
> 47 results · document

$ npx versuz install pdf-generator
✓ Wrote .claude/skills/pdf-generator/SKILL.md

$ npx versuz battle pdf-generator vs anthropic-pdf
WINNER · anthropic-pdf · Δ 8.4 (clear)`}
      </pre>

      <p>
        Three commands. Zero install — <code>npx</code> handles it. The
        whole package is 240 KB.
      </p>

      <h2>Why the CLI is what people use</h2>

      <p>
        The web marketplace optimises for <em>discovery</em> — filters,
        rankings, comparing axes side-by-side. But the moment a developer
        knows what they want, the web app becomes friction :
      </p>

      <ul>
        <li>Switch from terminal to browser.</li>
        <li>Find the item, click View, scroll to the install block.</li>
        <li>Triple-click to select the install command.</li>
        <li>Switch back to terminal, paste, run.</li>
      </ul>

      <p>
        Versus :
      </p>

      <pre>{`$ npx versuz install pdf-generator`}</pre>

      <p>
        The CLI removes the context switch. Once a user knows the slug
        they want, they never need the web app again — which sounds bad
        for &ldquo;engagement&rdquo; but is actually how good tools work.
        You don&apos;t want users to <em>have</em> to come back to your
        site, you want them to <em>choose</em> to.
      </p>

      <h2>The interactive mode was a mistake at first</h2>

      <p>
        Versuz CLI ships with an interactive REPL when called with no
        args : ASCII logo, prompts, search → table → install flow. I
        built it because I love TUIs.
      </p>

      <p>
        Two problems :
      </p>

      <ol>
        <li>
          People kept hitting <code>npx versuz</code>, getting the REPL,
          getting confused, closing it.
        </li>
        <li>
          Power users scripting Versuz needed deterministic output.
          Interactive prompts broke their pipes.
        </li>
      </ol>

      <p>
        The fix was small but mattered : show a one-screen <em>menu</em> on
        bare invocation listing the 4 most common commands with examples.
        Make every command also runnable directly (
        <code>npx versuz search</code>,{" "}
        <code>npx versuz install &lt;slug&gt;</code>,{" "}
        <code>npx versuz battle a vs b</code>). The REPL is gone. The menu
        gives you 3 seconds to decide, then you type the actual command.
      </p>

      <h2>The hardest decision : where to write the skill</h2>

      <p>
        Claude Code looks for skills at{" "}
        <code>.claude/skills/&lt;slug&gt;/SKILL.md</code> by convention. So
        that&apos;s where we write. But this puts <code>versuz</code> in the
        business of mutating the user&apos;s filesystem — a tool that runs
        with the user&apos;s shell privileges.
      </p>

      <p>
        Decisions we made :
      </p>

      <ul>
        <li>
          <strong>Default to cwd, not <code>~</code>.</strong> If you cd
          into a project, install lands in that project&apos;s{" "}
          <code>.claude/skills/</code>. If you run from <code>~</code>,
          it lands in <code>~/.claude/skills/</code>. Whichever you
          chose is whichever you get.
        </li>
        <li>
          <strong>Never silently overwrite.</strong> If{" "}
          <code>SKILL.md</code> already exists, we refuse and tell the
          user. <code>--force</code> bypasses, but the default is &ldquo;don&apos;t
          surprise me&rdquo;.
        </li>
        <li>
          <strong>One file at a time.</strong> Bundled skills (SKILL.md
          + scripts/) print a {`git clone`} suggestion instead. The CLI
          stays in the &ldquo;copy a single file&rdquo; mental model.
        </li>
      </ul>

      <h2>Submit was the surprise</h2>

      <p>
        I shipped <code>npx versuz submit &lt;repo-url&gt;</code> as an
        afterthought — the web submit form already existed, why duplicate ?
      </p>

      <p>
        It turned out submit-from-terminal is what authors actually want.
        You&apos;ve just finished a SKILL.md, you push it to GitHub,
        you&apos;re still in your terminal, you submit before you forget.
        No context switch, no &ldquo;sign in with GitHub&rdquo; flow
        (CLI auth uses a PAT cached in <code>~/.versuz/auth.json</code>).
      </p>

      <p>
        About 40% of submissions in the first month came through the
        CLI. The post-submit output prints the embeddable Versuz badge as
        markdown so authors can paste it into their README before the
        terminal scrolls off-screen.
      </p>

      <h2>Distribution learned</h2>

      <p>
        npm is the only registry that matters for a Node CLI. Publishing
        is one command — <code>npm publish</code> — but the keywords on
        the package matter more than the README. People find Versuz CLI
        by searching <em>npm</em> for &ldquo;claude skills&rdquo; or
        &ldquo;benchmark&rdquo;. Three keywords I almost forgot to add :
        <code>claude-code</code>, <code>ai-agent</code>,{" "}
        <code>elo</code>. Each one bumped install velocity measurably.
      </p>

      <p>
        For the MCP server, the same logic applies but with the MCP
        registries (Smithery, mcp.so, pulsemcp). We list there. Most
        Claude Code users wire MCPs from one of those.
      </p>

      <h2>What it cost</h2>

      <p>
        ~600 lines of JavaScript. <code>chalk</code> for color,{" "}
        <code>ora</code> for spinners, <code>cli-table3</code> for tables,{" "}
        <code>figlet</code> for the ASCII logo on first run,{" "}
        <code>prompts</code> for the interactive menu. No build step, no
        TypeScript, no test framework — <code>npm publish</code> just
        ships the source files. The whole package weighs 240 KB
        unzipped.
      </p>

      <p>
        Two weekends of work. Reaches more people than the web does.
      </p>

      <p style={{ marginTop: 32, fontSize: 14, color: "var(--fg-muted)" }}>
        Try it :{" "}
        <code style={{ background: "var(--surface)", padding: "2px 6px" }}>
          npx versuz
        </code>
        . Source on{" "}
        <a href="https://github.com/TomaTV/versuz" style={{ color: "var(--accent)" }}>GitHub</a>.
      </p>
    </>
  );
}
