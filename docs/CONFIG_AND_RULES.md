# Config And Rules

## Repo Layout

VoiceLint v0.1 uses repo-local configuration:

```text
voicelint.config.yml
voicelint/
  rules/
    style.no-em-dash.yml
    style.no-en-dash.yml
    copy.avoid-generic-product-words.yml
    product.preferred-terms.yml
```

## Supported File Types

v0.1 lints exactly these file types:

- `.md`
- `.mdx`
- `.txt`

Markdown and MDX use Markdown-aware segmentation. Plain text uses line and
paragraph segmentation.

## Default Discovery Rules

Default include behavior:

- when a discovered file has a supported extension, it is eligible for linting
- users may narrow discovery with config `include` globs

Default ignore globs:

- `.git/**`
- `node_modules/**`
- `dist/**`
- `build/**`
- `coverage/**`
- `.next/**`
- `.nuxt/**`

Config `ignore` patterns add to this default list.

## Config Schema

`voicelint.config.yml` fields:

| Field | Required | Type | Meaning |
| --- | --- | --- | --- |
| `version` | yes | number | Schema version; v0.1 uses `1` |
| `profile` | yes | string | Active profile name for diagnostics |
| `rulesDir` | no | string | Defaults to `voicelint/rules` |
| `include` | no | list of globs | Narrows discovered files before linting |
| `ignore` | no | list of globs | Adds repo-local ignore patterns |
| `rules` | no | map of rule id to `error`, `warning`, or `off` | Overrides per-rule severity from rule files |

Example:

```yaml
version: 1
profile: product
rulesDir: voicelint/rules

include:
  - "**/*.md"
  - "**/*.mdx"
  - "**/*.txt"

ignore:
  - "archive/**"

rules:
  style.no-em-dash: error
  style.no-en-dash: error
  copy.avoid-generic-product-words: warning
  product.preferred-terms: warning
```

## Rule Schema

Each YAML rule file must declare exactly one mechanical matcher form:

- `match`
- `terms`
- `substitution`

Shared fields:

| Field | Required | Type | Meaning |
| --- | --- | --- | --- |
| `id` | yes | string | Stable dotted rule id |
| `type` | yes | string | Must be `mechanical` in v0.1 |
| `severity` | yes | string | Default severity: `error` or `warning` |
| `description` | yes | string | Human explanation of the rule |
| `message` | yes | string | Diagnostic message |

Pattern rule example:

```yaml
id: style.no-em-dash
type: mechanical
severity: error
description: Do not use em dashes.

match:
  pattern: "—"

message: "Use a comma, colon, parentheses, or a sentence break instead of an em dash."
```

Terms rule example:

```yaml
id: product.preferred-terms
type: mechanical
severity: warning
description: Use approved VoiceLint terminology.

terms:
  "AI assistant": "agent"
  "auto rewrite": "suggestion"

message: "Use approved VoiceLint terminology."
```

Substitution rule example:

```yaml
id: copy.avoid-generic-product-words
type: mechanical
severity: warning
description: Avoid generic product-copy words that do not name a concrete workflow.

substitution:
  "seamless": "specific workflow description"
  "revolutionary": "concrete claim"

message: "Replace generic product-copy language with a concrete claim."
```

Precedence:

- rule file `severity` is the default
- config `rules.<id>` overrides severity
- config may set a rule to `off`

## Baseline Rules Created By `init`

`voicelint init` creates these exact baseline rules:

### `style.no-em-dash`

- matcher: literal em dash `—`
- default severity: `error`
- suggestion style: replace with comma, colon, parentheses, or sentence break

### `style.no-en-dash`

- matcher: literal en dash `–`
- default severity: `error`
- suggestion style: use `to`, `through`, a hyphen, or explicit punctuation

### `copy.avoid-generic-product-words`

- matcher: literal substitution map
- default severity: `warning`
- initial discouraged terms:
  - `seamless`
  - `revolutionary`
  - `world-class`
  - `next-generation`

### `product.preferred-terms`

- matcher: literal terms map
- default severity: `warning`
- initial preferred terms:
  - `agent` instead of `AI assistant`
  - `suggestion` instead of `auto rewrite`

These baseline rules are intentionally mechanical examples. They are a starting
point, not a universal house style.

## Ignore Directives

Inline ignore directives exist only for Markdown and MDX in v0.1. Plain text
files do not support inline ignores.

Supported directives:

```md
<!-- voicelint-disable style.no-em-dash -->
<!-- voicelint-enable style.no-em-dash -->
<!-- voicelint-disable-next-line style.no-em-dash -->
```

`all` may be used instead of a rule id for full-disable blocks.
