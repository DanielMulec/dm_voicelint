# VoiceLint

VoiceLint is a linting system for natural-language text in software projects.

It is meant to feel closer to ESLint than to a writing assistant: repo-local configuration, explicit rules, predictable diagnostics, hook-friendly CLI behavior, and no silent rewriting.

## Status

This repository is in the product and architecture phase. The first implementation is planned as a public TypeScript CLI package for npm.

The intended command shape is:

```bash
npx voicelint init
npx voicelint .
npx voicelint changed
npx voicelint staged
```

These commands are not implemented yet.

## Why

AI agents can produce a lot of text quickly: product copy, docs, changelogs, prompts, issue comments, release notes, and UI strings. The problem is not only whether the text is grammatical. The problem is whether it fits the product.

VoiceLint turns product voice, brand voice, and editorial judgment into versioned, testable lint rules.

## Scope

VoiceLint v0.1 is planned to include:

- a CLI runnable through `npx`
- repo-local `voicelint.config.yml`
- YAML rule files
- deterministic mechanical rules
- optional semantic rules with provider-backed structured output
- Markdown-oriented text segmentation
- file path, `changed`, `staged`, and `stdin` input modes
- pretty, JSON, and agent-friendly output formats
- line-based diagnostics
- local cache for semantic checks
- rule fixtures and `voicelint test`
- basic ignore comments
- optional Codex and Claude hook setup through `init --agent`

VoiceLint v0.1 does not rewrite text. Diagnostics may include suggestions, but linting should not silently change files.

## Product Boundary

VoiceLint core is:

- CLI
- repo-local configuration
- rules
- diagnostics
- cache
- optional semantic provider integration

VoiceLint core is not:

- a Codex plugin
- a Claude Code skill
- a hosted service
- a writing assistant
- a rewrite engine

Agent integrations should call the CLI. They should not define the product behavior.

## Documentation

- [Product overview](PRODUCT.md)
- [Decisions](docs/DECISIONS.md)
- [Rule format](docs/RULE_FORMAT.md)
- [Agent integration](docs/AGENT_INTEGRATION.md)
- [Engineering standards](docs/ENGINEERING.md)
- [Roadmap](docs/ROADMAP.md)
- [Open questions](docs/OPEN_QUESTIONS.md)

## Development

The implementation should optimize for clarity, strictness, and testability over clever abstractions.

Planned stack:

- TypeScript
- `strict: true`
- small modules with explicit boundaries
- typed result objects for normal control flow
- fixtures for rules and diagnostics

See [AGENTS.md](AGENTS.md) for the working contract used by AI coding agents in this repository.
