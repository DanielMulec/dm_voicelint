# Roadmap

## Current State

Completed planning phases:

- phase 0: repo intake and implementation contract lock
- phase 1: documentation closure and v0.1 spec lock

Implementation has not started beyond the help-only CLI stub.

## v0.1 Delivery Order

1. Tooling scaffold: TypeScript, ESLint, test runner, and the 400-line file
   guard.
2. CLI argument parsing and config loading.
3. File discovery for paths, `changed`, `staged`, and stdin.
4. Markdown and plain-text segmentation with stable source locations.
5. Mechanical rule loading and evaluation.
6. Diagnostic assembly and `pretty` / `json` / `agent` formatting.
7. Ignore handling for default ignores and Markdown/MDX inline directives.
8. `init` scaffolding and optional Codex hook setup through `.codex/hooks.json`.
9. Release verification, packaging, and initial npm publish.

The detailed tracker lives in [Implementation plan](IMPLEMENTATION_PLAN.md).

## v0.1 Scope

The first release should include:

- public npm package
- CLI runnable through `npx`
- `voicelint init`
- repo-local `voicelint.config.yml`
- one active profile per repo
- YAML rule files
- deterministic mechanical linting only
- supported file types `.md`, `.mdx`, `.txt`
- input modes for paths, `changed`, `staged`, and stdin
- pretty, JSON, and agent output
- line-based diagnostics with optional suggestions
- basic ignore comments for Markdown and MDX
- optional project-local Codex hook setup

## Deferred After v0.1

- semantic rule runner
- provider-backed semantic output
- agent-session semantic linting
- semantic rule fixtures and a public `voicelint test`
- local user cache for semantic checks
- multiple profiles per repo
- file-based profile overrides
- voice fit scoring
- `voicelint report`
- `voicelint audit`
- SARIF output
- GitHub code scanning integration
- VS Code extension
- shared brand profiles as npm packages
- local/Ollama provider
- Anthropic provider
- Gemini provider
- Chinese API providers
- safe mechanical autofix

## Probably Out Of Scope

- semantic rewriting as part of linting
- hidden global profile selection
- grammar checking as the main product goal
- native macOS menu bar app
- Raycast extension
