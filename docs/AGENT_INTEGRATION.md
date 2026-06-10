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
npx voicelint init --agent claude
```

`init --agent` may create project-local hook files, but it must not silently edit global user configuration.

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

VoiceLint should prefer project-local files such as:

```text
.codex/config.toml
.codex/hooks.json
```

The exact file should be chosen when implementation starts and verified against the current Codex hook schema.

## Claude Code

Claude Code also supports hooks that can run commands and block actions.

VoiceLint should provide a Claude setup path, but the core CLI should not depend on Claude-specific features.

## Agent-Assisted Semantic Checks

Agent-assisted semantic checks are a research direction, not part of the mechanical MVP.

The idea:

1. VoiceLint detects that semantic checks are required.
2. A hook blocks progress and returns a structured task to the agent.
3. The agent evaluates the text against the semantic rule and continues only after addressing issues.

This may reduce the need for separate LLM API keys in agent-first workflows, but it has tradeoffs:

- It is harder to test than provider-backed semantic linting.
- It is harder to cache.
- It is not CI-friendly.
- Every agent harness behaves differently.
- The CLI cannot assume a standard cross-agent callback API.

The implementation should start with deterministic linting. Once the mechanical engine works, semantic linting should be evaluated in two tracks:

1. provider-backed semantic linting
2. agent-assisted semantic linting through active Codex, Claude Code, or similar sessions

The product preference is to make agent-assisted semantic linting work if it can be made reliable enough, because it may avoid separate API keys in agent-first workflows.

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
