# Implementation Plan

## Goal

Ship a public npm CLI that performs deterministic mechanical linting for repo
text without rewriting files.

## Phase Tracker

| Phase | Status | Deliverable |
| --- | --- | --- |
| 0. Repo intake and contract lock | complete | Repo understanding and v0.1 boundary brief |
| 1. Documentation closure | complete | CLI, config, rule, diagnostic, testing, and release docs |
| 2. Tooling scaffold | pending | TypeScript, ESLint, test runner, file-size guard, npm scripts |
| 3. Input discovery | pending | Path, `changed`, `staged`, and stdin resolution |
| 4. Segmentation and rule loading | pending | Markdown/plain-text segmentation and YAML rule loading |
| 5. Rule evaluation and diagnostics | pending | Mechanical evaluation, source mapping, and blocking semantics |
| 6. CLI formatting and ignores | pending | `pretty`, `json`, `agent`, default ignores, inline ignore directives |
| 7. Init and Codex hook setup | pending | `init`, baseline rule scaffolding, `.codex/hooks.json` merge path |
| 8. Release readiness | pending | CI checks, package verification, release checklist completion |

## Current Milestone

The next implementation milestone is phase 2: build the TypeScript and test
scaffold without introducing production rule behavior yet.

Required outputs for phase 2:

- `tsconfig.json` with strict mode
- ESLint config with `complexity: ["error", 3]`
- test runner and fixture layout
- line-count enforcement for code files
- npm scripts for smoke, lint, typecheck, tests, and line-count checks

## Work Breakdown

### CLI and Inputs

- keep the command surface limited to paths, `changed`, `staged`, `init`, and
  stdin
- make no-argument interactive invocation a usage error
- keep git-backed discovery separate from CLI parsing

### Config and Rules

- validate `voicelint.config.yml`
- load YAML rule files from `voicelint/rules/`
- support only mechanical rule forms in v0.1

### Diagnostics and Formatting

- emit stable source locations
- keep warnings non-blocking
- make JSON deterministic for agent and CI consumption

### Safety

- never rewrite user text
- keep `init --agent codex` project-local
- back up edited hook files before writing them

## Definition Of Done For v0.1

v0.1 is done only when all of the following are true:

- the CLI behavior matches `CLI_SPEC.md`
- config and rule loading match `CONFIG_AND_RULES.md`
- diagnostic output matches `DIAGNOSTIC_MODEL.md`
- the required tests in `TEST_STRATEGY.md` exist and pass
- `init` creates the documented baseline files and Codex hook config safely
- release verification passes the steps in `RELEASE_CHECKLIST.md`

## Tracking Rule

Every implemented behavior must land with tests in the same phase. The project
should never rely on chat context to explain what remains to build.
