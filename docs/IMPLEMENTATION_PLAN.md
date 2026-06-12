# Implementation Plan

## Goal

Ship a public npm CLI that performs deterministic mechanical linting for repo
text without rewriting files.

## Phase Tracker

| Phase | Status | Deliverable |
| --- | --- | --- |
| 0. Repo intake and contract lock | complete | Repo understanding and v0.1 boundary brief |
| 1. Documentation closure | complete | CLI, config, rule, diagnostic, testing, and release docs |
| 2. Tooling scaffold | complete | TypeScript, ESLint, Vitest, CI, file-size guard, npm scripts, compiled bin shim |
| 3. CLI parser and command shell | complete | Typed parser, exit codes, command routing, placeholder init/lint command shells |
| 4. Input discovery | complete | Path, `changed`, `staged`, and stdin discovery plus source reading without rule coupling |
| 5. Config loading and baseline init | complete | Repo-local config parsing plus baseline `voicelint init` file creation |
| 6. Segmentation and source locations | complete | Markdown/plain-text segmentation with stable line and column mapping |
| 7. Rule loading | complete | YAML rule loading into typed mechanical rule definitions |
| 8. Rule evaluation and diagnostics | complete | Mechanical evaluation, source mapping, and blocking semantics |
| 9. CLI formatting and ignores | pending | Formatter polish plus inline ignore directives |
| 10. Codex hook setup | pending | `.codex/hooks.json` merge path for `init --agent codex` |
| 11. Release readiness | pending | CI checks, package verification, release checklist completion |

## Completed So Far

Phase 2 outputs now in repo:

- `tsconfig.json` with strict mode
- ESLint config with `complexity: ["error", 3]`
- Vitest test runner and initial CLI/tooling tests
- line-count enforcement for code files
- npm scripts for smoke, lint, typecheck, tests, line-count checks, and build
- CI workflow that runs install, typecheck, lint, test, line-count, build, and smoke

Phase 3 outputs now in repo:

- typed CLI parser and argument routing
- explicit `exit-code`, `result`, and `error` modules
- command shells for `init` and lint input modes
- tests for help, version, invalid flags, invalid formats, invalid reserved
  command paths, path mode, diff modes, and stdin defaults

Phase 4 outputs now in repo:

- decoupled input modules for path discovery, git working-tree discovery, git
  staged discovery, stdin reading, source reading, and path filtering
- staged source reads from the Git index instead of the unstaged working tree
- tests for supported text discovery, default ignore directories, missing paths,
  unsupported files, changed mode, staged mode, and stdin source paths

Phase 5 outputs now in repo:

- repo-local config loading with YAML parse errors, schema validation, and
  missing-config failures for lint commands
- config-driven include and exclude globs wired into the existing discovery
  layer
- baseline `voicelint init` creation for `voicelint.config.yml` and the
  baseline rule files, with idempotence and conflict reporting
- tests for valid config parsing, invalid YAML, unknown severities, missing
  config errors, and init creation/idempotence/conflicts

Phase 6 outputs now in repo:

- line indexing and source-range mapping with LF and CRLF support
- Markdown segmentation for headings, paragraphs, and list items
- fenced code block skipping and inline-code exclusion ranges for literal checks
- plain-text line and paragraph segmentation
- tests for heading, paragraph, list-item, CRLF, fenced-code, inline-code,
  multibyte column, and empty-file behavior

Phase 7 outputs now in repo:

- YAML loading for repo-local rule files under `voicelint/rules/`
- typed mechanical rule definitions for `match`, `terms`, and `substitution`
- validation for invalid YAML, invalid rule schemas, semantic-rule rejection,
  invalid regex patterns, duplicate rule ids, and unknown configured rule ids

Phase 8 outputs now in repo:

- mechanical rule evaluation for Markdown, MDX, and plain-text sources
- deterministic diagnostics with exact source ranges and optional suggestions
- config severity overrides applied over rule file severities
- blocking exit-code behavior for `error` diagnostics with stable JSON output

## Current Milestone

The next implementation milestone is phase 9: formatter polish and inline
ignore directives.

Required outputs for phase 9:

- finalize `pretty`, `json`, and `agent` output details against the CLI docs
- add inline ignore directive parsing and enforcement

## Work Breakdown

### CLI and Inputs

- keep the command surface limited to paths, `changed`, `staged`, `init`, and
  stdin
- keep git-backed discovery separate from CLI parsing and command routing
- preserve the current typed parser shell while adding real input discovery

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
