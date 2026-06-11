# Test Strategy

## Goal

Every implemented behavior must land with tests in the same change. The v0.1
test strategy is built around deterministic mechanical behavior.

## Current Repository Verification

The repository now has real tooling verification even though lint execution is
still a shell.

Current implemented verification commands:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run check:lines`
- `npm run build`
- `npm run smoke`

Current implemented tests:

- CLI help output
- CLI version output
- invalid reserved command paths
- invalid flags
- invalid formats
- path-mode parsing
- `changed` and `staged` parsing
- explicit stdin parsing and default stdin path behavior
- repo-local config parsing and validation
- missing-config failures for lint commands
- baseline `init` creation, idempotence, and conflict handling
- path discovery for `.md`, `.mdx`, and `.txt`
- default ignored directories for discovery
- missing-path and unsupported-file handling
- changed-mode Git fixture discovery
- staged-mode Git fixture discovery with index content reads
- file-line guard behavior

## v0.1 Test Layers

### 1. Smoke

- keep `npm run smoke` for the published CLI entrypoint
- verify `bin/voicelint.mjs --help` stays executable

### 2. Unit Tests

Required unit coverage:

- CLI argument parsing
- config parsing and validation
- rule loading
- severity override resolution
- ignore directive parsing
- formatter rendering

### 3. Fixture Tests

Required fixture coverage:

- mechanical rule pass/fail behavior
- Markdown and MDX source location mapping
- plain-text location mapping
- ignore comment behavior
- diagnostic ordering

Suggested fixture layout:

```text
test/
  fixtures/
    cli/
    config/
    rules/
    segmentation/
    ignores/
    diagnostics/
```

### 4. CLI Integration Tests

Required CLI integration coverage:

- explicit file path input
- directory traversal
- stdin with and without `--stdin-filepath`
- `changed` in a temp Git repo
- `staged` in a temp Git repo
- exit codes `0`, `1`, and `2`
- `pretty`, `json`, and `agent` output modes
- `init`
- `init --agent codex`

### 5. Governance Checks

Required non-behavioral checks:

- ESLint with `complexity` max `3`
- TypeScript strict mode
- code-file line-count guard at 400 lines

## CI Definition Of Done

The v0.1 CI pipeline is done only when it runs and enforces all of these:

1. install dependencies on a supported Node 20+ runtime
2. `npm run smoke`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `npm run check:lines`

No live provider calls are allowed in normal CI for v0.1.

## Test Authoring Rules

- use fixtures for rule and diagnostic behavior
- keep tests focused on one behavior each
- prefer temp repos over mocks for `changed` and `staged`
- assert exact output for `json` and `agent`
- assert exit codes explicitly
