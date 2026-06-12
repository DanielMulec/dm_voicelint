# Agent Integration

VoiceLint should be agent-friendly without being agent-specific.

Codex, Claude Code, Git hooks, editor extensions, and CI should all call the same CLI. The CLI owns linting behavior. Agent integrations only decide when and how to call it.

## Principle

The integration boundary is a shell command:

```bash
npx voicelint changed --format agent
```

This keeps VoiceLint portable across agent harnesses.

## Init Flow

VoiceLint should offer optional agent setup commands:

```bash
npx voicelint init
npx voicelint init --agent codex
```

`init --agent codex` creates or verifies the normal VoiceLint baseline first,
then installs project-local Codex hook files. It must not silently edit global
user configuration. Claude setup is deferred until after v0.1.

Hook setup is intentionally after the base CLI path. Config loading, input
discovery, segmentation, mechanical diagnostics, ignore handling, output
formatting, and the safe project-local Codex hook merge now work.

The init output should remind the user that agent projects may need to be trusted before project-local hooks run.

Example reminder:

```text
VoiceLint wrote project-local Codex hook config.
Codex only loads project-local hooks for trusted projects.
Open Codex, inspect the hook config, and trust this project if you want the hook to run.
```

## Existing Hook Files

`init --agent` must preserve existing hook configuration.

Required behavior:

- parse the existing project-local hook file before editing it
- add the VoiceLint hook only if it is not already present
- keep existing hooks and unrelated settings
- write a backup before changing an existing hook file
- abort with a clear manual instruction if the existing file cannot be parsed safely
- never overwrite a hook file wholesale unless the user explicitly asks for reset behavior

## Codex

Codex supports project-local configuration and hooks, but project-local config is only loaded when the project is trusted.

VoiceLint installs these project-local files:

```text
.codex/hooks.json
.codex/voicelint-post-tool-use-hook.mjs
.codex/voicelint-stop-hook.mjs
```

The selected v0.1 hook target is `.codex/hooks.json`. VoiceLint merges its hook
entries into existing project-local hook config, preserves unrelated events and
handlers, and backs up changed existing hook config before writing.

### PostToolUse

Purpose: give Codex quick feedback after file-editing tools.

Matcher:

```text
apply_patch|Edit|Write
```

The generated wrapper reads Codex hook input from stdin, then runs:

```bash
npx voicelint changed --format agent
```

If VoiceLint exits `0`, the wrapper writes `{}`. If VoiceLint exits `1` or `2`,
the wrapper writes JSON with `decision: "block"` and a reason containing the
diagnostics or setup/config failure. The wrapper does not modify files.

### Stop

Purpose: provide a final safety net before Codex stops.

The generated wrapper reads Codex hook input from stdin. If
`stop_hook_active === true`, it writes `{ "continue": true }` to avoid recursive
blocking. Otherwise it runs:

```bash
npx voicelint changed --format agent
```

If VoiceLint exits `0`, the wrapper writes `{ "continue": true }`. If VoiceLint
exits `1` or `2`, it writes JSON with `decision: "block"` and asks Codex to make
one more pass or resolve setup/config failures before stopping. The wrapper does
not emit plain text stdout and does not modify files.

## Claude Code

Claude Code also supports hooks that can run commands and block actions.

VoiceLint should provide a Claude setup path, but the core CLI should not depend on Claude-specific features.

## Future Agent-Session Semantic Checks

Agent-session semantic checks are a preferred research direction, not part of the
mechanical v0.1 MVP.

The idea:

1. VoiceLint detects that semantic checks are required.
2. A hook or agent integration returns a structured lint task to the active Codex, Claude Code, Antigravity, or similar session.
3. The current agent session evaluates the text against the semantic rule and continues only after addressing issues.

This is preferred for common agent-first workflows because it may avoid requiring
a separate external LLM API call when a capable agent session is already active.
It has tradeoffs:

- It is harder to test than provider-backed semantic linting.
- It is harder to cache.
- It is not CI-friendly.
- Every agent harness behaves differently.
- The CLI cannot assume a standard cross-agent callback API.

The implementation should start with deterministic linting. Once the mechanical engine works, semantic linting should be evaluated in two tracks:

1. agent-session semantic linting through active Codex, Claude Code, Antigravity, or similar sessions
2. provider-backed semantic linting for CI, non-agent workflows, and reproducible automation

The product preference is to make agent-session semantic linting work if it can
be made reliable enough.

## Hook Output

Agent output should be concise and actionable:

```text
VoiceLint found 2 issues:

docs/onboarding.md:42
[voice.no-generic-ai-copy] Generic benefit language without a concrete workflow.
Suggestion: Name the specific workflow or remove the claim.

docs/onboarding.md:58
[style.no-em-dash] Use a comma, colon, parentheses, or sentence break instead.
```

Machine-readable output should remain available through JSON:

```bash
npx voicelint changed --format json
```
