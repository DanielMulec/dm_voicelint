# CLI Spec

## Command Grammar

VoiceLint v0.1 supports this command surface:

```text
voicelint [path ...] [--config PATH] [--format pretty|json|agent]
voicelint [--stdin-file-path PATH] [--config PATH] [--format pretty|json|agent]
voicelint --stdin [--stdin-file-path PATH] [--config PATH] [--format pretty|json|agent]
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
| `--stdin` | Explicit stdin mode | Cannot be combined with path arguments |
| `--stdin-file-path PATH` | Virtual path for stdin | Valid only when input comes from stdin; used for file-type detection and diagnostics |
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

Segmentation rules for supported text files:

- Markdown and MDX segment headings, paragraphs, and list items
- Markdown and MDX skip fenced code blocks
- Markdown and MDX exclude inline code spans from literal checks
- Plain text segments lines and paragraphs
- Line and column locations support both LF and CRLF inputs

## Stdin Mode

Stdin mode is active only when:

- no path arguments are provided
- the command is not `changed`, `staged`, or `init`
- stdin is piped or explicit `--stdin` is present

Behavior:

- if `--stdin-file-path` is present, VoiceLint uses that path for file-type
  detection and diagnostic file names
- if `--stdin-file-path` is absent, VoiceLint uses `<stdin>`
- path arguments may not be combined with explicit `--stdin`; that is a usage
  failure with exit code `2`
- `--stdin-file-path` without stdin mode is a usage failure
- `changed` and `staged` never read stdin

## `changed`

`voicelint changed` lints the working tree delta for the current repo.

Included files:

- tracked files added, copied, modified, or renamed relative to `HEAD`
- untracked files returned by `git ls-files --others --exclude-standard`

Excluded files:

- deleted files
- files filtered out by default ignores, config excludes, or unsupported
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
- files filtered out by default ignores, config excludes, or unsupported
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
.codex/voicelint-post-tool-use-hook.mjs
.codex/voicelint-stop-hook.mjs
```

Safety rules:

- missing files are created
- existing files with identical intended content are left untouched
- existing config or rule files with conflicting content cause exit code `2`
- baseline file conflicts print manual resolution instructions and are never
  overwritten
- no global user configuration is edited
- baseline files are created or verified before any `.codex` files are written
- existing `.codex/hooks.json` is parsed and merged, never overwritten wholesale
- unrelated hook events, matcher groups, and command handlers are preserved
- a modified existing hook file is backed up as
  `.codex/hooks.json.bak.<YYYYMMDDHHMMSS>`
- malformed existing hook config exits `2` with manual resolution instructions
  and does not write hook scripts
- generated Codex wrappers call `npx voicelint changed --format agent`

Generated hook behavior:

- `PostToolUse` matches `apply_patch|Edit|Write` and gives quick changed-file
  lint feedback after file-editing tools
- `Stop` runs before Codex stops and blocks stopping when VoiceLint reports
  blocking diagnostics or setup/config failures

## Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | No blocking diagnostics |
| `1` | One or more mechanical `error` diagnostics found |
| `2` | Usage failure, config failure, or internal failure |

Warnings do not change the exit code from `0` to `1`.
