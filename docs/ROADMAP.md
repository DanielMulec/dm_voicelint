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
- optional semantic rule runner with provider-backed structured output
- Markdown paragraph/list/heading segmentation
- input modes for file paths, `changed`, `staged`, and `stdin`
- pretty, JSON, and agent output formats
- diagnostics with line locations
- local user cache for semantic checks
- semantic rule fixtures and `voicelint test`
- basic ignore comments
- optional Codex and Claude hook setup through `init --agent`

## Deferred

- multiple profiles per repo
- file-based profile overrides
- voice fit scoring
- `voicelint report`
- `voicelint audit`
- SARIF output
- GitHub code scanning integration
- VS Code extension
- native macOS menu bar app
- Raycast extension
- hosted dashboard
- team management
- shared brand profiles as npm packages
- local/Ollama provider
- Anthropic provider
- Gemini provider
- agent-assisted semantic linting
- safe mechanical autofix

## Probably Out Of Scope

- semantic rewriting as part of linting
- hidden global profile selection
- grammar checking as a primary product goal
- replacing Vale or textlint for teams that only need deterministic prose linting
