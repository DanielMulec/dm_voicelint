# Release Checklist

## Scope

This checklist applies to the first deterministic mechanical CLI release.

## Pre-Release

1. Confirm the implemented behavior still matches:
   `CLI_SPEC.md`, `CONFIG_AND_RULES.md`, `DIAGNOSTIC_MODEL.md`, and
   `TEST_STRATEGY.md`.
2. Verify package metadata in `package.json`.
3. Confirm `README.md` explains the mechanical-only v0.1 scope and no-rewrite
   boundary.
4. Verify baseline rule files created by `init` match the documented ids and
   severities.

## Verification

Run all required release checks:

1. `npm run smoke`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run check:lines`
6. `npm pack`

Then validate the package artifact in a temp directory:

1. install the packed tarball
2. run `npx voicelint --help`
3. run `npx voicelint init` in a throwaway repo
4. run one happy-path lint command and one failing lint command

## Publish

1. publish the first implementation with the `next` dist-tag unless a stable
   release is explicitly chosen
2. confirm the published package exposes the `voicelint` bin
3. verify `npx voicelint --help` resolves from the registry

## Post-Publish

1. tag the release in Git
2. write release notes that state the mechanical-only boundary
3. record any follow-up defects or missing polish in the implementation tracker
