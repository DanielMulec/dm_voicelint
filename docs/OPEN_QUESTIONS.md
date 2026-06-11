# Open Questions

This document tracks genuinely unresolved questions. Settled v0.1 decisions
belong in `DECISIONS.md`.

## Semantic Execution After v0.1

Questions:

- Can active Codex, Claude Code, Antigravity, or similar sessions provide a
  reliable enough semantic lint loop for agent-first workflows?
- If provider-backed semantic linting is added, which provider should be the
  default first implementation?
- Should semantic linting stay disabled by default until a provider or agent
  session is configured explicitly?

## Future Provider Configuration

Questions:

- What is the exact machine-local config path on macOS, Linux, and Windows for
  future provider settings?
- Which Node package should resolve platform-specific cache and config
  directories for future semantic features?

## Future Claude Integration

Questions:

- If `init --agent claude` is added after v0.1, which project-local Claude file
  is safest to modify?
- What merge rules should apply if Claude already has unrelated hook settings?

## Future Profile Model

Questions:

- Should a post-v0.1 release add multiple named profiles in one repo?
- If file-based overrides are added, should they switch profiles or only rule
  severities?
