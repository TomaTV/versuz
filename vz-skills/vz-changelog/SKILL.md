---
name: vz-changelog
description: Generate a clean semantic changelog from git history using Conventional Commits. Groups by type (feat / fix / perf / refactor / docs), links PRs and commit SHAs, infers semver bump (major / minor / patch), and emits markdown ready to paste into CHANGELOG.md or a release note. Use after merging a batch of commits and before tagging a release.
tools: ["bash", "read", "write"]
model: claude-opus-4-7
license: Versuz Featured
---

# vz-changelog

Stop writing release notes by hand. If your repo follows Conventional Commits
(or close enough), this skill produces a tagged-and-linked changelog in 5
seconds, plus a semver bump recommendation.

## When to use

- Pre-release : you merged 12 commits since the last tag and need notes
- Mid-sprint : need to see "what changed since last Friday"
- Post-mortem : someone asks "what shipped between v2.3.0 and v2.4.0"

## When NOT to use

- Repo doesn't follow any commit convention → output will be noisy. First
  enforce Conventional Commits via commitlint, then come back.
- You want detailed multi-paragraph release notes with screenshots → human
  task, this skill emits structured but terse output.

## Conventional Commits primer

A commit message looks like :

```
<type>(<scope>): <description>

[optional body]

[optional footer with BREAKING CHANGE: or refs #123]
```

Types this skill recognizes :

| Type | Group in changelog | Bumps |
|---|---|---|
| `feat` | ## Features | minor |
| `fix` | ## Fixes | patch |
| `perf` | ## Performance | patch |
| `refactor` | ## Refactors | patch |
| `docs` | ## Docs | patch |
| `test` | ## Tests | (skipped from changelog) |
| `chore` | ## Chores | (skipped from changelog) |
| `revert` | ## Reverts | patch |
| `BREAKING CHANGE:` in footer | ## ⚠ Breaking | major |
| `feat!:` / `fix!:` (bang) | ## ⚠ Breaking | major |

## Workflow

### Step 1 — Find the range

```bash
# Last tag → HEAD
git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD
# Use this as $FROM
git log --oneline ${FROM}..HEAD
```

If no previous tag exists → start from the first commit.

### Step 2 — Parse commits

```bash
git log ${FROM}..HEAD \
  --pretty=format:'%H%x09%s%x09%b%x09%an' \
  --no-merges
```

For each line :
- Match `^(\w+)(\(.+\))?(!)?:\s*(.+)$` → extract type, scope, breaking-bang, subject
- Scan body for `BREAKING CHANGE:` → mark as breaking
- Extract `(#123)` from subject → PR link
- Bucket into the table above

### Step 3 — Detect semver bump

Walk the parsed commits :

- Any breaking → MAJOR
- Else any `feat` → MINOR
- Else (fix/perf/refactor/docs only) → PATCH

```bash
# Print the suggested next version
LAST=$(git describe --tags --abbrev=0 | sed 's/^v//')
# Bump LAST according to detected level → emit "v$NEW"
```

### Step 4 — Emit markdown

```markdown
## [v2.4.0] — 2026-05-11

### ⚠ Breaking
- **api**: replace `getUser(id)` with `getUser({ id, scope })` ([abc1234](../../commit/abc1234))

### Features
- **auth**: add Stripe Connect Express onboarding flow (#142, [d3f5678](../../commit/d3f5678))
- **marketplace**: introduce content-hash dedup ([9e8b1c0](../../commit/9e8b1c0))

### Fixes
- **scrape**: handle GitHub 422 (1000-result ceiling) without aborting (#138, [ab12cd3](../../commit/ab12cd3))

### Performance
- **bench**: dedup judge calls by output hash, ~30% fewer LLM calls ([5f4d3e2](../../commit/5f4d3e2))

### Docs
- update CONTEXT.md with V1.5 status ([7c6b5a4](../../commit/7c6b5a4))

[v2.4.0]: https://github.com/owner/repo/compare/v2.3.0...v2.4.0
```

## Output rules

1. **Drop empty groups** — if no `perf:` commits, omit the `### Performance` heading entirely
2. **Sort within group** : breaking > feat > fix > perf > refactor > docs
3. **Drop `chore:` and `test:`** — internal noise, not user-facing
4. **One commit per line** — if same commit fixes 2 things, the author should split it; you don't make it look like one
5. **Always include the SHA link** — even without PR, the SHA gives traceability
6. **Date format** : `YYYY-MM-DD`, never anything else

## Edge cases

- **Squash merges** : the merge commit subject becomes the source of truth
- **Multiple co-authors** : ignore them in the changelog (mention in release notes only)
- **Reverted commits** : show in `### Reverts` group with link to BOTH the original and the revert
- **Non-conventional commits in the range** : list under `### Other changes` at the bottom, no bump impact

## Verification

Before emitting :

```bash
# Sanity check : commit count matches what you parsed
expected=$(git log ${FROM}..HEAD --no-merges --oneline | wc -l)
parsed=$(echo "$CHANGELOG" | grep -c '^- ')
# parsed should be ≤ expected (we drop chore/test)
```

If parsed = 0 but expected > 0 → ALL commits are non-conventional. Output a
warning at the top of the changelog : `⚠ No Conventional Commits detected — output is best-effort.`

## CLI usage

Wrap the workflow in a one-liner :

```bash
# Suggested implementation in scripts/changelog.sh
FROM=${1:-$(git describe --tags --abbrev=0)}
TO=${2:-HEAD}
git log ${FROM}..${TO} --pretty=format:'%H%x09%s%x09%b' --no-merges \
  | <parser> \
  | <markdown emitter>
```

## Output format you return

1. The full markdown changelog (paste-ready)
2. Suggested version bump : `MAJOR | MINOR | PATCH` + the suggested next version string
3. A 1-line summary : `5 features, 3 fixes, 1 breaking — bump MAJOR to v3.0.0`
4. (Optional) Warnings about non-conventional commits

Keep it to that. Don't pad with explanations of what each commit does — that's
already in the commit message.
