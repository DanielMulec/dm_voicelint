# Open Questions

This document tracks unresolved questions. Decisions should move to `DECISIONS.md` once settled.

## Package Name

Is `voicelint` available on npm?

Preferred order:

- `voicelint`
- `@voicelint/cli`
- `@dm/voicelint`

## First Semantic Provider

Semantic provider work is deferred until the mechanical engine works.

Open questions for the semantic phase:

Questions:

- Which model should be the default?
- Should semantic linting be disabled unless a provider is configured?
- How should provider config be stored on each operating system?
- Can agent-assisted semantic linting use the active Codex or Claude Code session reliably enough to avoid separate API keys in common workflows?

## Agent Hook Schema

Codex and Claude hook schemas should be verified during implementation.

Questions:

- Should VoiceLint write `.codex/config.toml` or `.codex/hooks.json`?
- Which Claude Code config file is safest for project-local hook setup?
- What backup filename convention should `init --agent` use before editing existing hook files?

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
- Which Node package should VoiceLint use to resolve platform-specific user cache directories?

## Baseline Rules

Which baseline rules should `voicelint init` create?

Candidates:

- `style.no-em-dash`
- `style.no-en-dash`
- `voice.no-generic-ai-copy`
- `voice.no-fake-empathy`
- `voice.no-vague-transformation-promise`
- `voice.no-rhetorical-product-thesis`
