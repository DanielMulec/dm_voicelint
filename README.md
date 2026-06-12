# VoiceLint

VoiceLint is a linting system for natural-language text in software projects.

It is meant to feel closer to ESLint than to a writing assistant: repo-local
configuration, explicit rules, predictable diagnostics, hook-friendly CLI
behavior, and no silent rewriting.

## Status

The deterministic v0.1 CLI path is implemented through built-package
end-to-end coverage, including project-local Codex hook setup through
`init --agent codex`. The remaining planned v0.1 work is release verification
and publishing.

Implemented so far:

- TypeScript build, lint, test, and CI scaffold
- compiled npm CLI entrypoint through `bin/voicelint.mjs` -> `dist/cli/main.js`
- typed CLI parser and command shell for `--help`, `--version`, `init`, path
  mode, `changed`, `staged`, and `--stdin`
- repo-local config loading and validation for lint commands
- baseline `voicelint init` scaffolding for the repo-local config and rule files
- input discovery for paths, `changed`, `staged`, and stdin-backed sources
- Markdown/plain-text segmentation with stable source locations
- YAML mechanical rule loading and deterministic rule evaluation
- pretty, JSON, and agent diagnostic output
- Markdown and MDX ignore comment handling
- end-to-end built-package CLI coverage for init, lint, stdin, changed, and staged
- optional project-local Codex hooks for changed-file lint feedback
- engineering boundary refactors for config validation, source segmentation,
  diagnostic orchestration, mechanical evaluation, and output formatting

VoiceLint v0.1 is deterministic mechanical linting only. It does not do
semantic judging, provider calls, or file rewriting. Diagnostics may include
suggestions, but linting never edits user text.

## CLI Examples

```bash
npx voicelint init
npx voicelint .
npx voicelint changed
npx voicelint staged
npx voicelint --stdin
npx voicelint init --agent codex
```

## v0.1 Scope

- public npm CLI package
- repo-local `voicelint.config.yml`
- YAML rule files
- deterministic mechanical rules
- supported file types: `.md`, `.mdx`, `.txt`
- input modes for file paths, `changed`, `staged`, and stdin
- pretty, JSON, and agent-friendly output formats
- line-based diagnostics with optional suggestions
- basic ignore comments for Markdown and MDX
- optional project-local Codex hook setup through `init --agent codex`

## Deferred After v0.1

- semantic linting
- provider-backed judging
- agent-session semantic linting
- semantic caches
- multi-profile overrides
- SARIF output
- public `voicelint test`
- mechanical autofix

## Product Boundary

VoiceLint core is:

- CLI
- repo-local configuration
- rules
- diagnostics
- future semantic execution through agent-session or provider-backed checks

VoiceLint core is not:

- a Codex plugin
- a Claude Code skill
- a hosted service
- a writing assistant
- a rewrite engine

Agent integrations must call the CLI. They do not define product behavior.

## Documentation

- [Product overview](PRODUCT.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [CLI spec](docs/CLI_SPEC.md)
- [Config and rules](docs/CONFIG_AND_RULES.md)
- [Diagnostic model](docs/DIAGNOSTIC_MODEL.md)
- [Test strategy](docs/TEST_STRATEGY.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Decisions](docs/DECISIONS.md)
- [Rule format background](docs/RULE_FORMAT.md)
- [Agent integration background](docs/AGENT_INTEGRATION.md)
- [Engineering standards](docs/ENGINEERING.md)
- [Roadmap](docs/ROADMAP.md)
- [Open questions](docs/OPEN_QUESTIONS.md)

## Development

Mandatory engineering standards:

- TypeScript
- `strict: true`
- `noImplicitAny: true`
- no explicit `any`
- no implicit `any`
- ESLint `complexity` with `max: 3`
- maximum 400 lines per code file
- modular code separated by concern
- typed result objects for expected control flow
- fixtures for rules and diagnostics

Commit history is part of the project documentation. Commits on `main` must use
a concise subject plus `What:`, `Why:`, `How:`, `Files:`, and an
`Implemented with ...` line so GitHub history explains intent and
implementation without external chat logs.

To enable the repository hooks in a fresh clone, run:

```bash
git config core.hooksPath .githooks
```

See [AGENTS.md](AGENTS.md) for the working contract used by AI coding agents in
this repository.
