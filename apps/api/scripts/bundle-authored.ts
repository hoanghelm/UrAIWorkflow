export const AUTHORED: Record<string, string> = {
  "skill-caveman": `---
name: caveman
description: Telegraphic output style that strips filler while keeping code, commands, and structure intact.
---

# Caveman

Speak in the fewest words that carry the meaning. Trim prose, keep signal.

## Rules

- Drop articles, hedges, and pleasantries ("I think", "just", "simply", "please note").
- Keep code, commands, file paths, identifiers, and error text byte-for-byte. Never abbreviate them.
- Prefer fragments over sentences. One idea per line.
- Keep headings, lists, and tables. They are structure, not filler.
- No preamble, no recap, no "let me". State the result, then the reason if needed.

## Keep intact

- Fenced code blocks and their language tags.
- Shell commands and their flags.
- Numbers, units, and quoted strings.
- Anything the reader will copy or run.

## Example

Verbose: "I went ahead and updated the config file, and it should now work as expected."
Caveman: "Updated config. Works now."
`,

  "cmd-commit": `---
description: Stage changes, write a conventional commit message, and commit.
---

# /commit

Create one clean commit for the current changes.

## Steps

1. Run \`git status\` and \`git diff\` to see what changed.
2. Group the changes into a single logical commit. If they are unrelated, say so and ask before splitting.
3. Write a Conventional Commits message: \`type(scope): summary\`.
   - types: feat, fix, refactor, docs, test, chore, perf, build, ci.
   - summary in the imperative, lower case, no trailing period, under 72 chars.
   - add a body only when the why is not obvious from the diff.
4. Stage the files and commit.
5. Print the commit hash and the one-line summary.

Do not push. Do not amend an existing commit unless asked.
`,

  "cmd-review-pr": `---
description: Fetch a pull request and produce a structured review.
---

# /review-pr

Review a pull request and report actionable findings.

## Steps

1. Get the PR diff (\`gh pr diff <number>\`) and its description.
2. Read the changed files with enough surrounding context to judge them.
3. Check, in order:
   - Correctness: logic errors, edge cases, error handling, race conditions.
   - Security: injection, secrets, authz, unsafe input.
   - Tests: are the changes covered, do the tests assert real behaviour.
   - Clarity: naming, dead code, needless complexity.
4. Report findings ranked most severe first. For each: file and line, what is wrong, and the concrete fix.
5. End with a verdict: approve, comment, or request changes.

Review only what the diff changes. Do not restate the whole file.
`,

  "hook-format-on-save": `#!/usr/bin/env bash
# format-on-save — run the project formatter after a file is written or edited.
set -euo pipefail

file="\${CLAUDE_FILE_PATH:-}"
[ -z "\$file" ] && exit 0
[ -f "\$file" ] || exit 0

case "\$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md|*.css)
    if command -v prettier >/dev/null 2>&1; then
      prettier --write "\$file" >/dev/null 2>&1 || true
    elif [ -x node_modules/.bin/prettier ]; then
      node_modules/.bin/prettier --write "\$file" >/dev/null 2>&1 || true
    fi
    ;;
esac

exit 0
`,

  "hook-block-secrets": `#!/usr/bin/env bash
# block-secrets — refuse writes that contain obvious credentials.
set -euo pipefail

content="\${CLAUDE_FILE_CONTENT:-}"
[ -z "\$content" ] && exit 0

if printf '%s' "\$content" | grep -Eq \\
  '(sk-ant-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[baprs]-[0-9A-Za-z-]{10,})'; then
  echo "block-secrets: refusing to write a file that looks like it contains a credential." >&2
  exit 1
fi

exit 0
`,

  "hook-notify-on-stop": `#!/usr/bin/env bash
# notify-on-stop — desktop notification when a run finishes or needs input.
set -euo pipefail

title="\${1:-Claude}"
message="\${2:-Run finished}"

if command -v notify-send >/dev/null 2>&1; then
  notify-send "\$title" "\$message" || true
elif command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \\"\$message\\" with title \\"\$title\\"" || true
elif command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoProfile -Command "[console]::beep(880,200)" >/dev/null 2>&1 || true
fi

exit 0
`,

  "agent-docs-writer": `---
name: docs-writer
description: Writes and updates README and inline documentation from the code.
---

# Docs Writer

You document code so a new engineer can use it without reading every line.

## Boundaries

- Describe what exists. Do not invent features or APIs.
- Read the code before writing about it. Verify names, signatures, and defaults.
- Match the project's existing tone and structure.

## What you produce

- README sections: what it is, how to run it, how to use it, how it is laid out.
- Inline docs only where naming cannot carry the meaning.
- Examples that actually run against the current code.

## Rules

- Lead with the reader's task, not the implementation.
- Active voice, short sentences, no filler.
- Keep code samples minimal and correct.
`,
};
