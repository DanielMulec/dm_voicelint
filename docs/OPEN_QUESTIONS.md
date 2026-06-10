# Open Questions

This document tracks unresolved questions. Decisions should move to `DECISIONS.md` once settled.

## Package Name

Is `voicelint` available and desirable on npm, or should the package be scoped?

Options:

- `voicelint`
- `@dm/voicelint`
- `@voicelint/cli`

## License

Which license should the project use?

Likely options:

- MIT
- Apache-2.0

## First Semantic Provider

OpenAI is the likely first semantic provider, but this still needs an implementation decision.

Questions:

- Which model should be the default?
- Should semantic linting be disabled unless a provider is configured?
- How should provider config be stored on each operating system?

## Agent Hook Schema

Codex and Claude hook schemas should be verified during implementation.

Questions:

- Should VoiceLint write `.codex/config.toml` or `.codex/hooks.json`?
- Which Claude Code config file is safest for project-local hook setup?
- How should `init --agent` handle existing hook files?

## CI Behavior

How strict should CI be by default?

Likely starting point:

- mechanical `error` exits non-zero
- semantic `warning` exits zero
- semantic `error` exits non-zero only when `allowSemanticErrors: true`

## Cache Details

The cache should probably live in the user cache directory in v0.1.

Questions:

- What exact cache path should be used on macOS, Linux, and Windows?
- Should there be a `--no-cache` flag?
- Should there be a `voicelint cache clear` command?

## Baseline Rules

Which baseline rules should `voicelint init` create?

Candidates:

- `style.no-em-dash`
- `style.no-en-dash`
- `voice.no-generic-ai-copy`
- `voice.no-fake-empathy`
- `voice.no-vague-transformation-promise`
- `voice.no-rhetorical-product-thesis`
