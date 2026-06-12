# Roadmap

## Current State

Completed phases:

- phase 0: repo intake and implementation contract lock
- phase 1: documentation closure and v0.1 spec lock
- phase 2: TypeScript/tooling scaffold
- phase 3: CLI parser and command shell
- phase 4: input discovery
- phase 5: config loading and baseline init
- phase 6: segmentation and source locations

The repository now has a compiled TypeScript CLI shell, CI, and tests. Real
lint execution has not started yet, but the CLI can now discover the text
sources it will later lint through a real repo-local config and stable segment
locations.

Input discovery landed before config loading in implementation history, but
both are now complete in `main`.

## v0.1 Delivery Order

1. Completed: tooling scaffold with TypeScript, ESLint, Vitest, CI, and the
   400-line file guard.
2. Completed: CLI argument parsing, typed command routing, and placeholder
   command shells for `init`, paths, `changed`, `staged`, and stdin.
3. Completed: repo-local config loading, validation, and baseline
   `voicelint init` file creation.
4. Completed: file discovery for paths, `changed`, `staged`, and stdin content,
   plus staged reads from the Git index.
5. Completed: Markdown/plain-text segmentation with stable source locations.
6. Next: mechanical rule loading.
7. Next: rule evaluation and diagnostic assembly.
8. Next: `pretty` / `json` / `agent` formatting plus ignore handling for
   default ignores and Markdown/MDX inline
   directives.
9. Next: optional Codex hook setup through
   `.codex/hooks.json`.
10. Last: release verification, packaging, and initial npm publish.

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
