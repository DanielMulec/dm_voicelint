# VoiceLint

VoiceLint is a linting system for natural-language text in software projects. It checks whether product copy, documentation, changelogs, prompts, and agent-written text follow explicit voice and style rules.

The product should feel closer to ESLint than to a writing assistant: repo-local configuration, explicit rules, predictable diagnostics, hook-friendly CLI behavior, and no silent rewriting.

## Product Thesis

VoiceLint turns product voice, brand voice, and editorial judgment into versioned, testable lint rules.

It should help humans and AI agents share the same definition of whether a piece of text fits the product they are working on.

## Core Users

- Product builders who want generated text to fit a specific product and audience.
- Engineers and technical writers who want consistent docs, changelogs, README files, and UI text.
- AI coding agent users who want Codex, Claude Code, and similar tools to self-check generated text.
- Teams that need project-local voice rules instead of global personal writing preferences.

## Core Use Cases

- Lint Markdown, MDX, plain text, and agent-generated output in a local repository.
- Run deterministic rules for punctuation, terminology, capitalization, banned phrases, and similar checks.
- Later, run semantic rules for voice antipatterns that need meaning and context.
- Later, integrate with agent hooks so generated or edited text is checked automatically.
- Return diagnostics that are readable by humans and structured enough for agents, editors, and CI.
- Later, test semantic rules against good and bad examples.

## Non-Goals

- VoiceLint is not a general grammar checker.
- VoiceLint is not a document editor.
- VoiceLint does not rewrite text in v0.1.
- VoiceLint does not depend on Codex, Claude Code, or any specific agent harness.
- VoiceLint does not use hidden global profiles to decide whether repo text is acceptable.

## Product Shape

The core product is a CLI:

```bash
npx voicelint init
npx voicelint .
npx voicelint changed
npx voicelint staged
npx voicelint --stdin
```

Agent integrations, Git hooks, editor integrations, and future dashboards should all call the same CLI.

The current implementation proves the deterministic CLI path. Remaining v0.1
work should finish release verification before adding semantic linting,
provider-backed judging, or semantic rule test commands.

## Documentation Map

- [Decisions](docs/DECISIONS.md): v0.1 product and architecture decisions.
- [Rule Format](docs/RULE_FORMAT.md): YAML rule format and diagnostic model.
- [Agent Integration](docs/AGENT_INTEGRATION.md): Codex, Claude Code, and hook strategy.
- [Engineering](docs/ENGINEERING.md): implementation standards for the TypeScript codebase.
- [Roadmap](docs/ROADMAP.md): MVP scope, backlog, and deferred ideas.
- [Open Questions](docs/OPEN_QUESTIONS.md): unresolved product and technical questions.
