# Engineering Standards

These standards are mandatory for all VoiceLint code.

## TypeScript

VoiceLint must be implemented in TypeScript.

Required compiler and lint rules:

- `strict: true`
- `noImplicitAny: true`
- no explicit `any`
- no implicit `any`
- no unchecked broad casts
- no hidden global mutable state
- explicit return types for exported functions
- typed result objects for expected control flow

Implementation requirement:

- configure TypeScript and ESLint so violations fail locally and in CI
- use `unknown` plus narrowing instead of `any`
- use specific domain types instead of loose records where the shape is known

## File Size

Code files must be 400 lines or fewer.

This is a hard limit. A code file with 401 lines is non-compliant.

Required enforcement:

- add an automated line-count check before the first implementation is considered complete
- run that check in CI
- split files before they exceed the limit

Generated files are the only allowed exception, and generated files must be marked as generated.

## Complexity

Cyclomatic complexity must be capped at the TypeScript equivalent of Python McCabe 3.

Required enforcement:

- configure ESLint `complexity` with `max: 3`
- fail lint and CI when a function exceeds complexity 3
- split branching logic instead of raising the threshold

Required code shape:

- use guard clauses when they reduce branching
- move independent decisions into separate functions
- separate parsing, validation, evaluation, formatting, cache access, provider access, and CLI orchestration
- keep command handlers thin; command handlers may coordinate work but must not contain rule logic

## Separation Of Concerns

The codebase must be modular by separation of concerns.

Required boundaries:

- CLI argument parsing
- config loading and schema validation
- file discovery and git diff input
- Markdown/plain-text segmentation
- rule loading
- mechanical rule evaluation
- diagnostic creation
- output formatting
- ignore handling
- cache access
- provider integration

Modules must not mix these responsibilities. If a module needs two responsibilities, split it.

## Naming And Readability

Names must make the code understandable without relying on surrounding chat context.

Required naming standards:

- variables must name the domain concept they hold
- functions must name the action or decision they perform
- booleans must read as predicates, for example `isSemanticRule` or `hasBlockingDiagnostics`
- generic names such as `data`, `item`, `thing`, `stuff`, `result2`, and `handleIt` are not acceptable unless the scope is trivial and the meaning is still obvious

## Comments

Code must be well-commented where comments improve human understanding.

Required comment standards:

- comment non-obvious decisions, invariants, tradeoffs, and external constraints
- comment why a boundary exists when it prevents accidental coupling
- do not add comments that merely restate the next line of code

Good comment:

```ts
// Include the model id in the cache key because providers may change verdicts
// for the same prompt and rule.
```

Bad comment:

```ts
// Set the cache key.
```

## Testing

Tests must cover rule behavior and diagnostic behavior with focused fixtures.

Required test areas:

- config parsing
- rule loading
- mechanical rule evaluation
- source location mapping
- ignore handling
- output formatting
- line-count enforcement
- complexity enforcement through lint configuration

Semantic provider tests may use fakes or fixtures. They must not require live provider calls for normal CI.
