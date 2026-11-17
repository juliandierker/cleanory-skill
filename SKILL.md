---
name: cleanory
description: Use right before handing work back to the user, after code changes are done. Runs the project's linters, type check, dead-code scan and dependency audit, fixes what they find, and only reports done when everything is clean.
---

# cleanory

Run the project's static analysis before you hand back. Do not report done on a dirty tree.

## Routine

1. Detect the checks: `node <skill-dir>/scripts/detect.mjs [project-dir]`. It prints JSON with `lint`, `typecheck`, `deadcode`, `audit` and `test` entries and runs nothing. If the project documents its own commands (README, contributing guide, agent instructions), prefer those over the detected ones.
2. Run every check, in the order listed.
3. Fix findings caused by your change. Auto-fixers (`--fix`) are fine; read the diff they produce.
4. Re-run until every check exits 0.
5. Hand back with the exact commands you ran and their results.

## Rules

- Never silence a finding to make it pass: no disabling rules, no `any` casts, no ignore entries, no skipped tests, unless the user agreed.
- Dead code reported in files you touched is yours to remove. Findings in code you did not touch: report them, do not fix them unasked.
- A dependency audit failure you did not cause: report the advisory and the fixed version. Do not upgrade or add dependencies without asking.
- If a check cannot run (missing tool, no network), say which one and why. Never imply it passed.
- Never commit with hooks bypassed (`--no-verify`).

See `references/checks.md` for what each category covers and how to read the results.
