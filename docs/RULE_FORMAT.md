# Rule Format

VoiceLint v0.1 uses YAML for configuration and mechanical rules.

Markdown rule files are deferred. YAML keeps rules structured, parseable, testable, and easier for agents to modify safely.

## Mechanical Rule Examples

```yaml
id: style.no-em-dash
type: mechanical
severity: error
description: Do not use em dashes.

match:
  pattern: "—"

message: "Use a comma, colon, parentheses, or a sentence break instead of an em dash."
```

```yaml
id: product.preferred-terms
type: mechanical
severity: warning
description: Use the approved product terminology.

terms:
  "AI assistant": "agent"
  "auto rewrite": "suggestion"

message: "Use approved VoiceLint terminology."
```

```yaml
id: copy.avoid-seamless
type: mechanical
severity: warning
description: Avoid generic product-copy words that do not name a concrete workflow.

substitution:
  "seamless": "specific"
  "revolutionary": "specific"

message: "Replace generic product-copy language with a concrete claim."
```

## Future Semantic Rule Example

Semantic rules are deferred until after the mechanical v0.1 path is working.

```yaml
id: voice.no-fake-empathy
type: semantic
severity: warning
scope: paragraph
description: |
  Avoid performative empathy that does not help the user.

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

## Future Semantic Verdicts

Semantic judges return one of three verdicts:

- `pass`
- `fail`
- `uncertain`

`uncertain` should never block CI or agent progress.

Expected structured output:

```json
{
  "verdict": "fail",
  "confidence": 0.88,
  "reason": "The sentence claims empathy but gives no useful information or next step.",
  "suggestion": "Remove the empathy phrase and explain what happened."
}
```

## Diagnostics

VoiceLint diagnostics should be stable enough for humans, agents, editors, and CI.

Example:

```json
{
  "file": "docs/onboarding.md",
  "line": 42,
  "column": 1,
  "endLine": 42,
  "endColumn": 67,
  "profile": "product",
  "ruleId": "voice.no-generic-ai-copy",
  "severity": "warning",
  "message": "Generic benefit language without a concrete workflow.",
  "reason": "The sentence could apply to almost any SaaS product.",
  "suggestion": "Name the specific workflow or remove the claim.",
  "confidence": 0.86
}
```

## Rule Tests

The v0.1 implementation should use focused internal fixtures for mechanical rule
and diagnostic behavior.

A public `voicelint test` command is deferred until the rule authoring workflow
needs stable good/bad fixtures, especially for semantic rules.

Example command:

```bash
voicelint test voicelint/rules/no-generic-ai-copy.yml
```

Example output:

```text
PASS bad/ai-saas-hero.md -> fail
PASS good/changelog.md -> pass
FAIL good/onboarding-cta.md -> fail, expected pass
```

Rule tests are the main defense against vague prompts, model drift, and false positives.

## Ignore Comments

VoiceLint needs a clear escape hatch.

Inline example:

```md
<!-- voicelint-disable-next-line voice.no-generic-ai-copy -->
Unlock seamless productivity with AI.
```

Block example:

```md
<!-- voicelint-disable voice.no-fake-empathy -->
We understand how frustrating this must be.
<!-- voicelint-enable voice.no-fake-empathy -->
```

Ignores should support rule ids and full-disable blocks.
