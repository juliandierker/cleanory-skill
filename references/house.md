# /cleanory house: per-step detail

Checked against fallow 3.46. Run every command from the project root. Prefix with `npx -y` the first time (`npx -y fallow ...`). Add `--format json` when you want to parse findings.

## Before the scan

- `npx -y fallow --version` proves fallow runs. If it fails, stop.
- `npx fallow list` shows the entry points fallow found. Compare them with the project's real ones (`package.json` `main`, `bin`, `exports`, scripts, framework routes). A missing entry makes everything under it look unused.
- A real entry point fallow missed goes into the fallow config (`.fallowrc.json`, `.fallowrc.jsonc` or `fallow.toml`) under `entry`, an array of root-relative globs. A file only tests or tooling load goes under `supportEntry`; a file loaded by a computed path goes under `dynamicallyLoaded`. Put that config change in commit 1 and name it in the plan.
- `npx fallow explain <issue-type>` explains one finding type, for example `unused-file`.

## Step 1: unused files

Scan:

```sh
npx fallow dead-code --unused-files
```

Trace each file before you plan its deletion:

```sh
npx fallow dead-code --trace-file path/to/file.ts
```

`UNREACHABLE` means no entry point reaches it. Also grep for the file name: config files, scripts, HTML, and dynamic `import()` with a computed path can load a file fallow cannot see.

Apply: `fallow fix` does not delete files. Delete them yourself with `git rm`.

Commit: `chore(cleanory): remove unused files`

## Step 2: unused fragments, boilerplate, redundancy

Scan:

```sh
npx fallow dead-code --unused-exports --unused-types --unused-class-members --unused-enum-members
```

Trace an export before removing it:

```sh
npx fallow dead-code --trace path/to/file.ts:exportName
```

Apply in this order:

1. Preview the auto-fix, scoped to the source folders so it leaves `package.json` alone:

   ```sh
   npx fallow fix --dry-run --no-create-config src
   ```

   `fallow fix` removes unused exports, unused enum members and unused dependencies. Dependencies belong to step 3, so pass one or more source folders as the path. If the dry run still lists a `package.json` line, run `git restore` on every `package.json` after the fix. `--no-create-config` stops it from writing a new `.fallowrc.json`.

2. Apply the same command with `--yes` instead of `--dry-run`:

   ```sh
   npx fallow fix --yes --no-create-config src
   ```

   Read the diff. Removing `export` can leave a local that is now unused; delete it if the linter or typecheck says so.

3. Remove unused types and unused class members by hand. `fallow fix` does not touch them.

Duplicates are report-only in fallow. Scan both modes:

```sh
npx fallow dupes
npx fallow dupes --mode semantic
```

`semantic` treats renamed variables as the same clone. Each group prints a fingerprint like `dup:8c0e4171`. Inspect a group with the same mode that found it:

```sh
npx fallow dupes --mode semantic --trace dup:8c0e4171
```

A trace without the matching `--mode` reports no clone group. Merge clear duplicates by hand into one shared function and update the callers. List the rest in the report with their locations: near-duplicates whose differences matter, test fixtures, generated code.

Commit: `refactor(cleanory): drop unused exports and duplicates`

## Step 3: unused dependencies

Scan:

```sh
npx fallow dead-code --unused-deps
```

This covers `dependencies`, `devDependencies` and `optionalDependencies`, plus production dependencies used only in types or tests, and dev dependencies used in production code.

Confirm each before planning its removal:

```sh
npx fallow dead-code --trace-dependency <pkg>
```

Also grep `package.json` scripts and config files: CLIs, plugins and presets are often referenced only by name.

Apply with the project's package manager, chosen by its lockfile:

| Lockfile | Remove |
|---|---|
| `package-lock.json` | `npm uninstall <pkg>` |
| `pnpm-lock.yaml` | `pnpm remove <pkg>` |
| `yarn.lock` | `yarn remove <pkg>` |
| `bun.lock` or `bun.lockb` | `bun remove <pkg>` |

A production dependency used only in types or tests moves to `devDependencies` rather than going away: remove it, then add it back with the dev flag. Do not hand-edit `package.json` for this step.

Commit: `chore(cleanory): remove unused dependencies`

## Plan format

```text
Commit 1  chore(cleanory): remove unused files
  - src/old-widget.ts (unreachable, no references)
  - .fallowrc.json: add entry "scripts/seed.ts"
Commit 2  refactor(cleanory): drop unused exports and duplicates
  - src/lib.ts: export b, type T, Box.unused, Color.Blue
  - merge sumX and sumY (dup:8c0e4171) into src/sum.ts
  Report only: dup:1a2b3c4d src/a.ts:10-30, src/b.ts:12-32 (differ in error handling)
Commit 3  skipped, no unused dependencies
```

## Checks before each commit

Use the commands the project documents (README, contributing guide, agent instructions, `package.json` scripts): lint, typecheck, tests. Re-run the step's fallow scan too; a removal can expose new dead code, which goes in the same commit when it is small, otherwise into the report.
