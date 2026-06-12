# Decisions

This document records settled product and architecture decisions for VoiceLint
v0.1. Exact behavioral details live in the linked spec documents.

## Distribution

VoiceLint should ship as a public npm package.

The `voicelint` package name was checked with npm on June 11, 2026. `npm view
voicelint` returned `E404`, so the unscoped name appeared available before the
first publish.

Preferred package name:

1. `voicelint`

Fallback package names:

- `@danielmulec/voicelint`
- `@voicelint/cli`

The current pre-release package version is `0.0.5`. The initial publication
may use the `next` dist-tag.

## License

VoiceLint should use the MIT license.

## Core Product Boundary

VoiceLint core is:

- CLI
- repo-local configuration
- rules
- diagnostics
- future semantic execution through agent-session or provider-backed checks

VoiceLint core is not:

- a Codex plugin
- a Claude Code skill
- a hosted service
- a writing assistant
- a rewrite engine

Agent integrations should wrap the CLI. They should not define product
behavior.

## v0.1 Scope Lock

VoiceLint v0.1 is deterministic mechanical linting only.

That means:

- no semantic judging
- no provider-backed execution
- no agent-session semantic checks
- no file rewriting
- no hidden global profiles

Diagnostics may include suggestions, but linting never edits files.

Supported file types for v0.1:

- `.md`
- `.mdx`
- `.txt`

See [CLI spec](CLI_SPEC.md), [Config and rules](CONFIG_AND_RULES.md), and
[Diagnostic model](DIAGNOSTIC_MODEL.md) for the exact behavior.

## Repo-Local Configuration

Repo-local configuration is the default.

Machine-local state is reserved for operational concerns such as future provider
credentials and future cache location. Repo config must remain shareable and
deterministic.

The v0.1 config file is:

```text
voicelint.config.yml
```

The default rule directory is:

```text
voicelint/rules/
```

One active profile per repo is supported in v0.1.

The v0.1 config fields are:

- `profile`
- `rules`
- `include`
- `exclude`

Unknown configured rule ids are config failures, not warnings, so misspelled
rule overrides do not silently disable lint behavior.

## Source Locations And Markdown Literal Scope

VoiceLint diagnostic locations use 1-based Unicode code-point columns, not byte
offsets, and end positions are exclusive.

Both LF and CRLF inputs must map to the same logical line and column model.

For Markdown and MDX mechanical literal checks:

- headings, paragraphs, and list items are the segmentable text blocks
- fenced code blocks are skipped
- inline code spans are excluded from literal matching

## Mechanical Rule Model

VoiceLint v0.1 implements mechanical rules only.

Supported v0.1 rule forms:

- `match`
- `terms`
- `substitution`

All baseline rules must remain purely mechanical. Semantic-looking rules are
deferred unless they are represented only as literal phrase substitutions.

The baseline rules created by `voicelint init` are:

- `style.no-em-dash`
- `style.no-en-dash`
- `copy.avoid-generic-product-words`
- `product.preferred-terms`

The following are explicitly deferred from the baseline:

- `voice.no-fake-empathy`
- `voice.no-vague-transformation-promise`

## Exit Codes

VoiceLint v0.1 exit codes are fixed:

- `0`: no blocking diagnostics
- `1`: one or more mechanical `error` diagnostics found
- `2`: usage failure, config failure, or internal failure

Warnings never change the exit code from `0` to `1`.

## Input Modes

The supported v0.1 input modes are:

- explicit file and directory paths
- `changed`
- `staged`
- stdin

`changed` and `staged` are part of the core CLI, not agent-specific wrappers.

## Output Formats

VoiceLint v0.1 supports exactly these output formats:

- `pretty`
- `json`
- `agent`

SARIF is deferred until after the deterministic CLI is working.

## Ignore Directives

VoiceLint v0.1 inline ignore directives are limited to Markdown and MDX.

Supported forms:

- `<!-- voicelint-disable RULE_ID -->`
- `<!-- voicelint-enable RULE_ID -->`
- `<!-- voicelint-disable-next-line RULE_ID -->`
- `all` in place of `RULE_ID` for full-disable behavior

Behavior:

- `disable-next-line` affects only the following source line
- `disable` starts on the following source line and remains active until the
  matching `enable` or end-of-file
- `enable` only matches an earlier `disable` for the exact same target
- malformed ignore comments never suppress diagnostics
- unmatched `enable` comments never suppress diagnostics

## Init And Codex Hook Setup

`voicelint init` should create a useful default repo-local setup.

`voicelint init --agent codex` should manage the project-local Codex hook file:

```text
.codex/hooks.json
```

When an existing hook file must be changed, VoiceLint writes a backup using this
timestamped naming pattern:

```text
<filename>.bak.<YYYYMMDDHHMMSS>
```

Hook setup must preserve unrelated existing settings, add VoiceLint only when it
is missing, and abort with a clear manual instruction if the file cannot be
parsed safely.

Global user configuration must never be edited.

## Future Semantic Direction

Mechanical linting must work without an LLM provider.

Semantic linting remains deferred until after the mechanical CLI is complete.
The preferred research direction is agent-session semantic linting, with
provider-backed semantic linting as a possible path for CI and non-agent
workflows.

Provider credentials must not live in repo config.

## Future Semantic Cache

If semantic caching is added later, it should use a local user cache instead of
a repo-local cache unless a later decision changes that default.

## References

- [Implementation plan](IMPLEMENTATION_PLAN.md)
- [CLI spec](CLI_SPEC.md)
- [Config and rules](CONFIG_AND_RULES.md)
- [Diagnostic model](DIAGNOSTIC_MODEL.md)
- [Test strategy](TEST_STRATEGY.md)
- [Release checklist](RELEASE_CHECKLIST.md)
