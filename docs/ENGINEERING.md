# Engineering Standards

VoiceLint should be implemented in TypeScript.

The first implementation should optimize for clarity, strictness, and testability over clever abstractions.

## TypeScript

Required standards:

- `strict: true`
- no implicit `any`
- no explicit `any`
- no unchecked broad casts
- no hidden global mutable state
- small functions
- low cyclomatic complexity
- clear variable and function names
- explicit return types for exported functions

## Code Shape

Prefer:

- pure functions for parsing, rule evaluation, and formatting
- small modules with one responsibility
- typed result objects instead of throwing for normal control flow
- dependency injection for file system, provider, and cache boundaries
- fixtures for rule and diagnostic behavior

Avoid:

- large command handlers
- mixed parsing/evaluation/output logic
- provider-specific logic inside the rule engine
- comments that restate obvious code
- premature plugin systems

## Comments

Comments should explain decisions or non-obvious constraints.

Good comment:

```ts
// Include the model id in the cache key because providers may change verdicts
// for the same prompt and rule.
```

Bad comment:

```ts
// Set the cache key.
```

## Complexity

Code should stay intentionally simple. As a rough standard, functions should be small enough that a reader can understand them without building a mental state machine.

When a function begins to accumulate branching, split it by concept: parse input, resolve config, evaluate rules, format diagnostics, or handle process exit.
