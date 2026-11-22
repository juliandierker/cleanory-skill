---
name: cleanory
description: Use when the user says /cleanory house, or asks to clean up dead code, unused files, unused exports or types, duplicated code, or unused dependencies in a JavaScript or TypeScript project. Scans with fallow, shows one plan, and after a single yes makes up to three stacked commits on the current branch.
---

# cleanory

`/cleanory house` cleans a JavaScript or TypeScript project of dead code in up to three stacked commits, from low-hanging to detailed:

1. **Unused files**
2. **Unused fragments, boilerplate and redundancy**: exports, types, class and enum members, duplicates
3. **Unused dependencies**

It runs [fallow](https://fallow.tools) through `npx fallow`, so it needs Node.js and network access the first time. Fallow is never added to the project.

## Flow

1. **Preflight.** The working tree must be clean (`git status --porcelain` prints nothing). If it is not, stop and ask. Note the current branch; all commits go there. Dependencies should be installed, or fallow misreports imports.
2. **Scan all three steps first**, changing nothing. Run the scan commands and trace every finding as in `references/house.md`.
3. **Drop false positives.** Leave out anything the user marked as kept: entry points, public API, generated code. If fallow flags a file a framework or tool loads implicitly, plan a fallow `entry` config change for it instead of a deletion.
4. **Show one plan**, grouped by commit: what each commit will remove and why, plus the duplicates you will only report. Say which steps found nothing and will be skipped.
5. **Wait for a single yes.** Without it, change nothing.
6. **Do commit 1, 2, 3 in order.** For each:
   - apply that step's removals only;
   - run the project's own checks (whatever it documents: lint, typecheck, tests) and fix the fallout;
   - if checks fail and you cannot fix it, stop and report; keep earlier commits;
   - commit with a Conventional Commit message.
7. **Report** the commits made, what was removed, what was only reported, and what was skipped or not verified.

## Commit messages

- `chore(cleanory): remove unused files`
- `refactor(cleanory): drop unused exports and duplicates`
- `chore(cleanory): remove unused dependencies`

## Rules

- Skip a commit whose step found nothing.
- Never push. Never commit with `--no-verify`.
- Remove dependencies with the project's package manager, so the lockfile updates.
- Do not silence findings with ignore comments or config to make the scan pass, except `entry` for real entry points.
- If fallow cannot run (no Node, no network), say so and stop. Never imply the house is clean.

Commands, flags and per-step detail: `references/house.md`.
