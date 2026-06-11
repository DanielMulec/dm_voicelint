# CLI Spec

## Command Grammar

VoiceLint v0.1 supports this command surface:

```text
voicelint [path ...] [--config PATH] [--format pretty|json|agent] [--stdin-file-path PATH]
voicelint changed [--config PATH] [--format pretty|json|agent]
voicelint staged [--config PATH] [--format pretty|json|agent]
voicelint init [--agent codex]
voicelint --help
voicelint --version
```

Rules:

- `changed`, `staged`, and `init` are reserved first-position subcommands.
- Any other first non-option token starts path mode.
- `.` is an ordinary path argument.
- No interactive default target exists. `voicelint` with no paths and no piped
  stdin exits with code `2`.

## Shared Flags

| Flag | Meaning | v0.1 behavior |
| --- | --- | --- |
| `--config PATH` | Repo-local config path | Defaults to `voicelint.config.yml` in the current working directory |
| `--format FORMAT` | Output formatter | Allowed values: `pretty`, `json`, `agent`; default is `pretty` |
| `--stdin-file-path PATH` | Virtual path for stdin | Valid only in stdin mode; used for file-type detection and diagnostics |
| `--help` | Print usage | Exits `0` |
| `--version` | Print package version | Exits `0` |

## Path Mode

Path mode lints the explicit file and directory arguments.

Rules:

- Directories are traversed recursively.
- Only supported file types are linted.
- Unsupported files are skipped, not treated as errors.
- Output ordering is deterministic: file path, then line, then column, then
  rule id.

## Stdin Mode

Stdin mode is active only when:

- no path arguments are provided
- the command is not `changed`, `staged`, or `init`
- stdin is piped

Behavior:

- if `--stdin-file-path` is present, VoiceLint uses that path for file-type
  detection and diagnostic file names
- if `--stdin-filepath` is absent, VoiceLint uses `<stdin>.md`
- path arguments and piped stdin may not be mixed; that is a usage failure with
  exit code `2`
- `changed` and `staged` never read stdin

## `changed`

`voicelint changed` lints the working tree delta for the current repo.

Included files:

- tracked files added, copied, modified, or renamed relative to `HEAD`
- untracked files returned by `git ls-files --others --exclude-standard`

Excluded files:

- deleted files
- files filtered out by default ignores, config ignores, or unsupported
  extensions

If the repo has no `HEAD` yet, `changed` should treat the working tree as the
candidate set.

If the current directory is not inside a Git repo, `changed` exits `2`.

## `staged`

`voicelint staged` lints the staged index delta for the current repo.

Included files:

- staged files added, copied, modified, or renamed in the index

Excluded files:

- deleted files
- files filtered out by default ignores, config ignores, or unsupported
  extensions

If the repo has no `HEAD` yet, `staged` should compare the index against the
empty tree.

If the current directory is not inside a Git repo, `staged` exits `2`.

## `init`

`voicelint init` creates the repo-local baseline without touching user text.

Files created by the base command:

```text
voicelint.config.yml
voicelint/rules/style.no-em-dash.yml
voicelint/rules/style.no-en-dash.yml
voicelint/rules/copy.avoid-generic-product-words.yml
voicelint/rules/product.preferred-terms.yml
```

`voicelint init --agent codex` additionally manages:

```text
.codex/hooks.json
```

Safety rules:

- missing files are created
- existing files with identical intended content are left untouched
- existing config or rule files with conflicting content cause exit code `2`
- existing `.codex/hooks.json` is parsed and merged, never overwritten
- a modified hook file is backed up as `<filename>.bak.<YYYYMMDDHHMMSS>`
- if an existing hook file cannot be parsed safely, VoiceLint exits `2` with a
  manual follow-up instruction
- no global user configuration is edited

## Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | No blocking diagnostics |
| `1` | One or more mechanical `error` diagnostics found |
| `2` | Usage failure, config failure, or internal failure |

Warnings do not change the exit code from `0` to `1`.
