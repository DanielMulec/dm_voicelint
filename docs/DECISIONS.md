# Decisions

This document records product and architecture decisions for VoiceLint v0.1.

## Distribution

VoiceLint should be distributed as a public npm package.

Public npm packages are free to publish and install on the public npm registry. Private npm packages require a paid npm account. VoiceLint should start public and open-source, with GitHub as the source repository and npm as the primary package distribution channel.

Preferred package name order:

1. `voicelint`
2. `@voicelint/cli`
3. `@dm/voicelint`

The unscoped `voicelint` name is preferred if available because it is short and matches CLI usage. A scoped package is acceptable if the unscoped name is unavailable or if a namespace becomes useful later.

Primary commands:

```bash
npx voicelint init
npm install -D voicelint
npx voicelint changed
```

For real projects, the recommended setup is a local dev dependency:

```bash
npm install -D voicelint
```

This lets `npx voicelint` resolve the project-pinned version instead of fetching a temporary remote package.

## License

VoiceLint should use the MIT license.

MIT is a low-friction default for open-source developer tools. It is widely understood, allows commercial and non-commercial use, and keeps adoption simple.

## Core Product Boundary

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

Agent integrations should wrap the CLI. They should not define the product behavior.

## Repo-Local Configuration

VoiceLint should default to repo-local configuration.

Repo-local config is reproducible: everyone who works in the repo sees the same lint rules. Machine-local config should be limited to operational concerns such as API keys, provider selection, cache location, and display preferences.

Example:

```text
voicelint.config.yml
voicelint/
  rules/
    no-em-dash.yml
    no-generic-ai-copy.yml
    terminology.yml
  examples/
    good/
    bad/
```

## Profile Model

VoiceLint v0.1 supports exactly one active profile per repo.

This keeps the first product version simple and prevents surprising profile resolution. Future versions may add multiple profiles or file-based overrides if the need is proven by real use.

Example v0.1 config:

```yaml
profile: product

rules:
  style.no-em-dash: error
  voice.no-generic-ai-copy: warning
  voice.no-fake-empathy: warning
```

Deferred model:

```yaml
overrides:
  - files: "site/**/*.mdx"
    profile: marketing
```

## Rule Types

VoiceLint v0.1 has two rule classes:

- **Mechanical rules**: deterministic checks that do not need an LLM.
- **Semantic rules**: LLM-judged checks for meaning, context, and voice antipatterns.

Voice fit scores are deferred. They may become part of a future `report` or `audit` mode, but they are not lint rules in v0.1.

The implementation should build the mechanical engine first. Semantic linting is deferred until mechanical rules, diagnostics, config loading, and hook-friendly CLI behavior are working.

## Rewriting

VoiceLint v0.1 does not rewrite files.

Diagnostics may include suggestions, but linting never changes text. This is intentional. Semantic rewrites can alter meaning, product claims, tone, and legal implications.

Potential future autofix support is limited to mechanically safe rules, such as punctuation or whitespace. Semantic rewrite remains out of scope unless explicitly reconsidered.

## Semantic Errors

Users may configure semantic rules as errors, but v0.1 should make this an explicit choice.

Recommended behavior:

```yaml
allowSemanticErrors: false
```

When `allowSemanticErrors` is false, semantic `error` severities are downgraded to `warning`. This prevents unstable LLM judgment from blocking agent workflows or CI by accident.

## Baseline Rules

`voicelint init` should create a useful default setup without requiring a template flag.

Baseline rules are examples and starting points. They should teach users how rules work, not claim to be a universal brand voice.

Future optional templates may add narrower rule sets:

```bash
npx voicelint init --template docs
npx voicelint init --template ai-copy-antipatterns
```

## Semantic Provider

Mechanical linting must work without an LLM provider.

Semantic linting needs a judge, but semantic provider work is deferred until the mechanical engine works.

The first provider-backed semantic implementation will likely support OpenAI first. Provider credentials must not live in repo config.

Machine-local examples:

```bash
OPENAI_API_KEY=...
```

Future work may add Anthropic, local/Ollama, Gemini, Chinese API providers, and agent-assisted semantic checks.

## Cache

Semantic linting should use a local cache.

The cache avoids repeated LLM calls for unchanged text and unchanged rules. It improves speed, reduces cost, and makes hook usage more practical.

Recommended v0.1 cache location:

```text
~/Library/Caches/voicelint
```

Repo cache is deferred because it creates extra files, merge questions, and possible privacy concerns.

The CLI should support cache controls:

```bash
voicelint changed --no-cache
voicelint cache clear
```

## SARIF

SARIF is deferred.

SARIF can later let GitHub and other code scanning UIs display VoiceLint diagnostics like static-analysis findings. It is useful for CI and repository dashboards, but it does not help the first local-agent workflow enough to belong in v0.1.
