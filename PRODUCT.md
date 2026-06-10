# VoiceLint Product Spec v0.1

## Product Thesis

VoiceLint is a linting system for natural-language text generated or edited by humans and AI agents. It should feel familiar to users of ESLint: repo-local configuration, explicit rules, machine-readable diagnostics, hook-friendly CLI behavior, and a clear distinction between warnings, errors, and optional fixes.

The core product idea is not "ask an LLM whether the text is good." The core product idea is to turn brand voice, product voice, and editorial judgment into versioned, testable lint rules.

## Core Users

- Product builders who want generated copy to fit a specific product, audience, and interaction context.
- Engineers and technical writers who want docs, changelogs, README files, and UI text to follow consistent prose rules.
- AI coding agent users who want Codex, Claude Code, and similar tools to self-check generated text before finishing a task.
- Teams or agencies that work across multiple products and need separate voice profiles per repo, brand, or content type.

## Core Use Cases

- Lint Markdown, MDX, plain text, and agent-generated output in a local repository.
- Run deterministic prose rules such as forbidden punctuation, terminology, capitalization, and banned phrases.
- Run semantic LLM-based rules for brand voice and antipatterns that deterministic linters cannot reliably detect.
- Use different profiles for different contexts, such as product docs, support replies, landing pages, changelogs, and internal documentation.
- Integrate with agent hooks so edited files or changed text can be checked automatically.
- Return diagnostics in formats useful for humans, agents, editors, and CI.
- Test semantic rules against good and bad examples to reduce prompt drift and false positives.

## Non-Goals

- VoiceLint is not a general grammar checker.
- VoiceLint is not a full writing assistant or document editor.
- VoiceLint should not silently rewrite user text during linting.
- VoiceLint should not rely on a hidden global profile when running inside a repository.
- VoiceLint should not make every semantic concern CI-blocking by default.

## Mental Model

VoiceLint has four primary concepts:

- **Project**: A repository or workspace where VoiceLint is installed and configured.
- **Profile**: A named voice context, such as `docs`, `marketing`, `support`, or `default`.
- **Rule**: A deterministic or semantic check that can emit diagnostics.
- **Diagnostic**: A structured finding with file, location, rule id, severity, explanation, and optional suggestion.

Profiles decide which rules apply to which files or text contexts. Rules decide what counts as a violation. Diagnostics are the only output of linting. Fixing is a separate action.

## Repo-Local Configuration

VoiceLint should default to repo-local configuration. This avoids accidental cross-project voice leakage.

Example structure:

```text
voicelint.config.yml
voicelint/
  profiles/
    docs.yml
    marketing.yml
    support.yml
  rules/
    no-generic-ai-copy.md
    no-fake-empathy.md
    terminology.yml
  examples/
    good/
    bad/
```

Shared brand rules should be reusable through package-style extension:

```yaml
extends:
  - "@company/voicelint-brand"

defaultProfile: docs

profiles:
  docs:
    include:
      - "README.md"
      - "docs/**/*.md"
    rules:
      style.no-em-dash: error
      voice.no-generic-ai-copy: warning
      voice.no-fake-empathy: warning

  marketing:
    include:
      - "site/**/*.mdx"
      - "content/**/*.md"
    rules:
      style.no-em-dash: error
      voice.no-vague-transformation-promise: warning
      voice.specificity: warning
```

Local repo configuration must win over shared packages.

## Profile Resolution

VoiceLint should choose profiles from explicit input first, then repo configuration.

Resolution order:

1. `--profile` CLI flag
2. file path profile detection from config
3. configured `defaultProfile`
4. error if no profile can be resolved

Ambiguous matches should not be silently ignored. The config needs either explicit priority or a path override.

Example:

```yaml
profileDetection:
  - profile: docs
    paths:
      - "README.md"
      - "docs/**"
  - profile: marketing
    paths:
      - "site/**"
      - "content/blog/**"
```

If one file matches multiple profiles, VoiceLint should report the ambiguity unless the config defines priority.

## Rule Types

### Mechanical Rules

Deterministic rules that should not require an LLM.

Examples:

- no em dash
- no en dash
- forbidden terms
- required terminology
- heading style
- sentence length
- banned phrases
- product-name casing

These rules can be CI-blocking.

### Semantic Antipattern Rules

LLM-judged rules for issues that require meaning, context, or tone judgment.

Examples:

- generic AI copy
- fake empathy
- fake urgency
- vague transformation promises
- overpromising
- hiding the concrete action behind abstraction
- release notes that sound important but say nothing
- chatbot-like apology loops

These rules should usually start as warnings. They become blocking only when well-tested and confidence thresholds are configured.

### Voice Fit Rules

Scored rules that describe text quality along dimensions rather than binary pass/fail.

Examples:

- specificity
- directness
- warmth
- hype
- technical precision
- confidence
- brand fit

These are useful for reports and reviews, but should not block by default.

## Semantic Rule Format

Semantic rules should be examples-first. A useful rule contains a clear description, fail conditions, pass conditions, good examples, and bad examples.

Example:

```yaml
id: voice.no-fake-empathy
type: semantic
severity: warning
scope: paragraph
description: Avoid performative empathy that does not help the user.

failWhen:
  - The text claims to understand the user's feelings without adding useful information.
  - The empathy phrase can be removed without changing the practical meaning.

passWhen:
  - The text explains the issue directly.
  - The text provides a concrete next step.

bad:
  - "We understand how frustrating this must be."
  - "We know how important your time is."

good:
  - "The upload failed because the file is larger than 25 MB."
  - "Export the file as CSV and upload it again."
```

The LLM judge should return structured output:

```json
{
  "verdict": "pass",
  "confidence": 0.91,
  "reason": "The paragraph explains the failure directly and does not use performative empathy.",
  "suggestion": null
}
```

Allowed verdicts:

- `pass`
- `fail`
- `uncertain`

`uncertain` should not block CI.

## CLI UX

The CLI should be the primary product surface.

Initial commands:

```bash
npx voicelint init
npx voicelint .
npx voicelint README.md
npx voicelint changed
npx voicelint staged
npx voicelint stdin --profile support
```

Modes:

```bash
voicelint changed --mode fast
voicelint changed --mode semantic
voicelint . --mode review
```

- `fast`: deterministic rules only
- `semantic`: deterministic plus semantic rules on relevant changed segments
- `review`: deeper semantic pass with broader document context

Output formats:

```bash
voicelint changed --format pretty
voicelint changed --format json
voicelint changed --format agent
voicelint changed --format sarif
```

## Diagnostics Format

VoiceLint should emit diagnostics that are stable enough for agents, editors, and CI.

Example:

```json
{
  "file": "docs/onboarding.md",
  "line": 42,
  "column": 1,
  "endLine": 42,
  "endColumn": 67,
  "profile": "docs",
  "ruleId": "voice.no-generic-ai-copy",
  "severity": "warning",
  "message": "Generic benefit language without a concrete workflow.",
  "reason": "The sentence could apply to almost any SaaS product.",
  "suggestion": "Name the specific workflow or remove the claim.",
  "confidence": 0.86
}
```

## Agent And Hook Integration

VoiceLint should be agent-friendly without being agent-specific.

Important commands:

```bash
voicelint changed --format agent
voicelint staged --format json
voicelint stdin --profile docs --format json
```

Codex, Claude Code, Git hooks, VS Code, and CI should all call the same CLI. The CLI should resolve profiles from repo config and return clear diagnostics. Agents should not need to guess the right profile.

Hook behavior should prefer changed text for speed, then allow deeper checks on demand.

## Fixing Model

Linting and rewriting must be separate.

```bash
voicelint README.md
voicelint fix README.md
voicelint fix README.md --rule voice.no-generic-ai-copy
```

Linting produces diagnostics. Fixing may produce edits or patches. Fixing should be opt-in, because semantic rewrites can alter meaning, tone, and product claims.

Automatic fixes are safest for mechanical rules. Semantic fixes should usually be suggestions or patch previews first.

## Ignore Model

VoiceLint needs a clear escape hatch.

Inline examples:

```md
<!-- voicelint-disable-next-line voice.no-generic-ai-copy -->
Unlock seamless productivity with AI.
```

Block examples:

```md
<!-- voicelint-disable voice.no-fake-empathy -->
We understand how frustrating this must be.
<!-- voicelint-enable voice.no-fake-empathy -->
```

Ignores should support rule ids and full disable blocks, and they should be visible in diagnostics or reports when requested.

## Caching

Semantic linting needs caching from the beginning.

Cache key inputs:

- text segment hash
- rule hash
- profile hash
- model identifier
- prompt version
- relevant context hash

Without caching, hook usage will be too slow and too expensive.

## Rule Testing

Semantic rules should be testable.

Example command:

```bash
voicelint test rules/no-generic-ai-copy
```

Example output:

```text
PASS bad/ai-saas-hero.md -> fail
PASS good/changelog.md -> pass
FAIL good/onboarding-cta.md -> fail, expected pass
```

Rule tests are the main defense against vague brand prompts, model drift, and false positives.

## MVP Scope

MVP should include:

- CLI package runnable with `npx`
- repo-local config
- profile detection by path
- deterministic rule runner
- semantic rule runner with structured LLM output
- Markdown paragraph/list/heading segmentation
- `changed`, `staged`, `file`, and `stdin` input modes
- pretty, JSON, and agent output formats
- diagnostics with line locations
- local cache for semantic checks
- semantic rule fixtures and `voicelint test`
- basic ignore comments

MVP should not include:

- native macOS app
- VS Code extension
- SARIF unless easy
- automatic semantic rewrites
- hosted dashboard
- team management

## Open Questions

- Should the first implementation use TypeScript for npm-native distribution, or another language with a packaged CLI wrapper?
- Should semantic rules be written as YAML, Markdown, or a hybrid directory format?
- Which LLM providers should be supported first?
- Should VoiceLint provide built-in baseline rules, or start with only project-defined rules?
- How strict should default profile resolution be when no file path matches?
- Should `error` be allowed for semantic rules in v0.1, or reserved until rule tests exist?
- Should cache live in the repo, user cache directory, or both?
- Should shared brand profiles be npm packages, git dependencies, or plain copied templates?

## Product Principle

VoiceLint should make voice rules explicit, inspectable, testable, and local to the work. The product succeeds if AI agents and humans can share the same definition of "this text fits this product" without relying on a vague prompt hidden in someone's workflow.
