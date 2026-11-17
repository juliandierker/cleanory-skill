# Check categories

| Category | Purpose | Typical commands |
|---|---|---|
| lint | style and correctness rules, formatting | project `lint` or `check` script, Biome, ESLint, oxlint, ruff, `go vet`, clippy |
| typecheck | the type system agrees with the code | `tsc --noEmit`, mypy |
| deadcode | unused files, exports and dependencies; boundary violations | fallow, knip, ts-prune |
| audit | known vulnerabilities in dependencies | `npm audit`, `pnpm audit`, `pip-audit`, `cargo audit`, `govulncheck` |
| test | behavior still works | project `test` script |

## Reading results

- Treat warnings as failures when the tool has a deny-warnings flag; the detected commands already pass it where one exists.
- A type error in a file you did not edit usually means your change broke a caller. Fix the caller or the change.
- An unused export you just added means the work is unfinished or the export is unnecessary.
- Audit output is a snapshot of the registry today. A new advisory unrelated to your change is a report item, not a blocker you cause.

## Detection

`scripts/detect.mjs` looks at lockfiles, `package.json` scripts and dependencies, and tool config files. It prefers the project's own `check`/`lint`/`typecheck`/`test` scripts over running tools directly. It also recognises Python, Go and Rust projects. If it exits non-zero, the directory is not a recognised project: pass the right directory or run the project's documented commands.
