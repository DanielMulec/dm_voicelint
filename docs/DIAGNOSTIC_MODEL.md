# Diagnostic Model

## v0.1 Diagnostic Contract

VoiceLint v0.1 emits deterministic mechanical diagnostics only.

Rules:

- diagnostics are sorted by file path, then line, then column, then rule id
- `error` diagnostics are blocking
- `warning` diagnostics are non-blocking
- no v0.1 diagnostic includes semantic `confidence`

## Diagnostic Fields

Every v0.1 diagnostic includes:

| Field | Required | Meaning |
| --- | --- | --- |
| `file` | yes | Repo-relative file path or stdin virtual path |
| `line` | yes | 1-based start line |
| `column` | yes | 1-based start column |
| `endLine` | yes | 1-based end line |
| `endColumn` | yes | 1-based end column |
| `profile` | yes | Active repo profile |
| `ruleId` | yes | Stable rule id |
| `severity` | yes | `error` or `warning` |
| `message` | yes | Human-readable diagnostic message |
| `suggestion` | no | Optional text-only suggestion |

Reserved for future semantic output, but absent in v0.1:

- `reason`
- `confidence`

Example v0.1 JSON diagnostic:

```json
{
  "file": "docs/onboarding.md",
  "line": 42,
  "column": 17,
  "endLine": 42,
  "endColumn": 25,
  "profile": "product",
  "ruleId": "style.no-em-dash",
  "severity": "error",
  "message": "Use a comma, colon, parentheses, or a sentence break instead of an em dash.",
  "suggestion": "Rewrite the sentence without the em dash."
}
```

## Run Result Shape

JSON format returns a single object with summary data and diagnostics:

```json
{
  "summary": {
    "scannedFileCount": 3,
    "diagnosticCount": 2,
    "errorCount": 1,
    "warningCount": 1,
    "exitCode": 1
  },
  "diagnostics": [
    {
      "file": "README.md",
      "line": 18,
      "column": 11,
      "endLine": 18,
      "endColumn": 12,
      "profile": "product",
      "ruleId": "style.no-em-dash",
      "severity": "error",
      "message": "Use a comma, colon, parentheses, or a sentence break instead of an em dash."
    }
  ]
}
```

If execution fails before linting starts and `--format json` is requested, the
CLI should emit:

```json
{
  "error": {
    "message": "Human-readable failure message"
  }
}
```

That error path still exits with code `2`.

## Output Formats

### `pretty`

`pretty` is the default human-facing format.

Requirements:

- group diagnostics by file
- show line and column
- include the rule id
- include a summary footer
- ANSI color is allowed only when stdout is a TTY

Example:

```text
README.md
  18:11  error    style.no-em-dash  Use a comma, colon, parentheses, or a sentence break instead of an em dash.

1 error, 0 warnings in 1 file
```

### `agent`

`agent` is the concise automation-facing text format.

Requirements:

- no ANSI color
- stable line-based output
- include the file, location, severity, rule id, and message
- include `Suggestion:` on a following line only when present

Example:

```text
README.md:18:11 [error] style.no-em-dash Use a comma, colon, parentheses, or a sentence break instead of an em dash.
Suggestion: Rewrite the sentence without the em dash.
```

### `json`

`json` is the machine-readable format described above. It must remain stable for
CI, editors, and agent tooling.
