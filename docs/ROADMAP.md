# Roadmap

## MVP

The MVP should include:

- public npm package
- CLI runnable through `npx`
- `voicelint init`
- repo-local `voicelint.config.yml`
- one active profile per repo
- YAML rule files
- deterministic rule runner
- Markdown paragraph/list/heading segmentation
- input modes for file paths, `changed`, `staged`, and `stdin`
- pretty, JSON, and agent output formats
- diagnostics with line locations
- basic ignore comments
- optional Codex and Claude hook setup through `init --agent`, implemented only after the base CLI path is stable

## Deferred

- semantic rule runner
- provider-backed structured semantic output
- agent-session semantic linting through active Codex, Claude Code, Antigravity, or similar sessions
- semantic rule fixtures and `voicelint test`
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

## Implementation Order

The first implementation should prove the deterministic path before hook setup:

1. CLI, config loading, and strict schema validation.
2. File discovery, git input modes, and stdin handling.
3. Markdown/plain-text segmentation with stable source locations.
4. Mechanical rule loading and evaluation.
5. Diagnostics and pretty, JSON, and agent output.
6. Ignore handling.
7. Optional Codex and Claude hook setup through `init --agent`.

## Speculative

- hosted dashboard for teams
- team rule management

These may become useful if teams need cross-repo rule distribution, review history, or governance. They are not part of the current roadmap.

## Probably Out Of Scope

- semantic rewriting as part of linting
- hidden global profile selection
- grammar checking as a primary product goal
- replacing Vale or textlint for teams that only need deterministic prose linting
- native macOS menu bar app
- Raycast extension
