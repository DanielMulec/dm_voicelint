# Agent Instructions

This file is the working contract for AI coding agents in this repository.

## Product Boundary

- VoiceLint is a linting system for natural-language text in software projects.
- Treat the core product as a CLI, not as a Codex plugin, Claude skill, hosted service, writing assistant, or rewrite engine.
- Agent integrations should call the same CLI that humans, Git hooks, editors, and CI call.
- Do not make v0.1 silently rewrite user text. Diagnostics may include suggestions, but linting should not edit files.

## Engineering Standards

- Implement in TypeScript.
- Prefer strict types, small functions, explicit return types for exported functions, and typed result objects.
- Keep parsing, rule evaluation, provider calls, caching, and formatting in separate boundaries.
- Prefer fixtures and focused tests for rule and diagnostic behavior.
- Do not add broad abstractions before the first CLI path proves that they remove real complexity.

## Product Priorities

- Repo-local configuration is the default.
- Mechanical linting must work without an LLM provider.
- Semantic linting is optional and provider-backed.
- Semantic `uncertain` verdicts must not block progress.
- Provider credentials must not live in repo config.
- Cache semantic checks in a local user cache, not in the repo, unless a later decision changes that.

## Repository Workflow

- For maintainer-local Codex work, stay on `main` unless Daniel explicitly asks for another branch.
- Do not create extra worktrees unless the task genuinely requires one.
- If the repository appears dirty, verify with `git status` before acting on that assumption.
- External contributors may use normal GitHub fork and pull request workflows.
