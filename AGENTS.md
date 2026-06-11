# Agent Instructions

This file is the working contract for AI coding agents in this repository.

## Product Boundary

- VoiceLint is a linting system for natural-language text in software projects.
- Treat the core product as a CLI, not as a Codex plugin, Claude skill, hosted service, writing assistant, or rewrite engine.
- Agent integrations must call the same CLI that humans, Git hooks, editors, and CI call.
- Do not make v0.1 silently rewrite user text. Diagnostics may include suggestions, but linting must not edit files.

## Engineering Standards

- Implement in TypeScript.
- Enforce strict typing: `strict: true`, `noImplicitAny: true`, no explicit `any`, no implicit `any`, no unchecked broad casts.
- Enforce the TypeScript equivalent of Python McCabe 3: ESLint `complexity` must be configured with `max: 3`, and violations must fail lint/CI.
- Enforce a hard maximum of 400 lines per code file. A code file with 401 lines is non-compliant.
- Keep the codebase modular by separation of concerns: CLI parsing, config loading, input discovery, segmentation, rule loading, rule evaluation, diagnostics, formatting, ignore handling, cache access, and provider access belong in separate boundaries.
- Use clear variable and function names that expose the domain concept or action.
- Add comments for non-obvious decisions, invariants, tradeoffs, and external constraints. Do not add comments that merely restate the code.
- Use typed result objects for expected control flow.
- Use fixtures and focused tests for rule and diagnostic behavior.
- Do not add broad abstractions before the first CLI path proves that they remove real complexity.

## Product Priorities

- Repo-local configuration is the default.
- Mechanical linting must work without an LLM provider.
- Semantic linting is optional and provider-backed.
- Semantic `uncertain` verdicts must not block progress.
- Provider credentials must not live in repo config.
- Cache semantic checks in a local user cache, not in the repo, unless a later decision changes that.

## Documentation Hygiene

- When a product or architecture question is decided, record the decision in `docs/DECISIONS.md`.
- Remove settled questions from `docs/OPEN_QUESTIONS.md`; do not leave "resolved" entries there.
- Keep decided material in other docs only when that document still needs it for user-facing explanation, implementation guidance, or roadmap context.
- Move content to the document with the clearest ownership instead of duplicating the same decision across several docs.

## Repository Workflow

- For maintainer-local Codex work, stay on `main` unless Daniel explicitly asks for another branch.
- Do not create extra worktrees unless the task genuinely requires one.
- If the repository appears dirty, verify with `git status` before acting on that assumption.
- External contributors may use normal GitHub fork and pull request workflows.
