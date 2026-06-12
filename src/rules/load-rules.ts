import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import fg from "fast-glob";
import { parseDocument } from "yaml";
import type { ZodIssue } from "zod";

import { exitCodes } from "../cli/exit-code.js";
import type { AppError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import {
  mechanicalRuleDefinitionSchema,
  type LoadedMechanicalRule,
  type MechanicalRuleDefinition,
  type PatternMatcher,
  type ReplacementEntry,
} from "./rule-schema.js";

const rulesDirectoryPath = "voicelint/rules";
const ruleFilePatterns = ["voicelint/rules/**/*.yml", "voicelint/rules/**/*.yaml"];

export async function loadRules(
  configFilePath: string,
): Promise<Result<readonly LoadedMechanicalRule[], AppError>> {
  const configDirectoryPath = dirname(configFilePath);
  const ruleFilePaths = await findRuleFiles(configDirectoryPath);
  return ruleFilePaths.length === 0
    ? err(createMissingRulesError(resolve(configDirectoryPath, rulesDirectoryPath)))
    : loadDiscoveredRules(configDirectoryPath, ruleFilePaths);
}

async function loadDiscoveredRules(
  configDirectoryPath: string,
  ruleFilePaths: readonly string[],
): Promise<Result<readonly LoadedMechanicalRule[], AppError>> {
  const loadedRules: LoadedMechanicalRule[] = [];

  for (const relativeRuleFilePath of ruleFilePaths) {
    const absoluteRuleFilePath = resolve(configDirectoryPath, relativeRuleFilePath);
    const ruleResult = await loadSingleRule(absoluteRuleFilePath);
    if (!ruleResult.ok) {
      return ruleResult;
    }

    loadedRules.push(ruleResult.value);
  }

  return ok(loadedRules);
}

async function findRuleFiles(configDirectoryPath: string): Promise<readonly string[]> {
  const discoveredRuleFiles = await fg(ruleFilePatterns, {
    cwd: configDirectoryPath,
    onlyFiles: true,
  });
  return [...discoveredRuleFiles].sort();
}

async function loadSingleRule(
  ruleFilePath: string,
): Promise<Result<LoadedMechanicalRule, AppError>> {
  const ruleSourceResult = await readRuleSource(ruleFilePath);
  return ruleSourceResult.ok
    ? parseLoadedRule(ruleFilePath, ruleSourceResult.value)
    : ruleSourceResult;
}

function parseLoadedRule(
  ruleFilePath: string,
  ruleSource: string,
): Result<LoadedMechanicalRule, AppError> {
  const ruleValueResult = parseRuleSource(ruleFilePath, ruleSource);
  return ruleValueResult.ok
    ? validateParsedRuleValue(ruleFilePath, ruleValueResult.value)
    : ruleValueResult;
}

function validateParsedRuleValue(
  ruleFilePath: string,
  ruleValue: unknown,
): Result<LoadedMechanicalRule, AppError> {
  return isSemanticRuleValue(ruleValue)
    ? err(createSemanticRuleError(ruleFilePath))
    : validateMechanicalRuleValue(ruleFilePath, ruleValue);
}

function validateMechanicalRuleValue(
  ruleFilePath: string,
  ruleValue: unknown,
): Result<LoadedMechanicalRule, AppError> {
  const parsedRule = mechanicalRuleDefinitionSchema.safeParse(ruleValue);
  return parsedRule.success
    ? createLoadedRule(ruleFilePath, parsedRule.data)
    : err(
        createRuleValidationError(
          ruleFilePath,
          parsedRule.error.issues.map(formatRuleIssue),
        ),
      );
}

async function readRuleSource(
  ruleFilePath: string,
): Promise<Result<string, AppError>> {
  try {
    return ok(await readFile(ruleFilePath, "utf8"));
  } catch (error) {
    return err(createRuleReadError(ruleFilePath, readErrorDetails(error)));
  }
}

function parseRuleSource(
  ruleFilePath: string,
  ruleSource: string,
): Result<unknown, AppError> {
  const parsedDocument = parseDocument(ruleSource);
  return parsedDocument.errors.length === 0
    ? ok(parsedDocument.toJS() as unknown)
    : err(createRuleParseError(ruleFilePath, readYamlErrorText(parsedDocument.errors)));
}

function isSemanticRuleValue(ruleValue: unknown): boolean {
  return isObjectValue(ruleValue) && ruleValue.type === "semantic";
}

function isObjectValue(
  value: unknown,
): value is { readonly type?: unknown } {
  return typeof value === "object" && value !== null;
}

function createLoadedRule(
  ruleFilePath: string,
  ruleDefinition: MechanicalRuleDefinition,
): Result<LoadedMechanicalRule, AppError> {
  if ("match" in ruleDefinition) {
    return createLoadedPatternRule(ruleFilePath, ruleDefinition);
  }

  return "terms" in ruleDefinition
    ? ok({
        ...createRuleBase(ruleFilePath, ruleDefinition),
        kind: "terms",
        terms: createReplacementEntries(ruleDefinition.terms),
      })
    : ok({
        ...createRuleBase(ruleFilePath, ruleDefinition),
        kind: "substitution",
        substitutions: createReplacementEntries(ruleDefinition.substitution),
      });
}

function createLoadedPatternRule(
  ruleFilePath: string,
  ruleDefinition: Extract<MechanicalRuleDefinition, { readonly match: unknown }>,
): Result<LoadedMechanicalRule, AppError> {
  const matcherResult = createPatternMatcher(ruleFilePath, ruleDefinition.match);
  return matcherResult.ok
    ? ok({
        ...createRuleBase(ruleFilePath, ruleDefinition),
        kind: "pattern",
        matcher: matcherResult.value,
      })
    : matcherResult;
}

function createPatternMatcher(
  ruleFilePath: string,
  match: Extract<MechanicalRuleDefinition, { readonly match: unknown }>["match"],
): Result<PatternMatcher, AppError> {
  if (match.regex !== true) {
    return ok({
      pattern: match.pattern,
      regex: false,
    });
  }

  try {
    return ok({
      pattern: match.pattern,
      regex: true,
      expression: new RegExp(match.pattern, "gu"),
    });
  } catch (error) {
    return err(
      createInvalidRegexError(ruleFilePath, match.pattern, readErrorDetails(error)),
    );
  }
}

function createRuleBase(
  ruleFilePath: string,
  ruleDefinition: MechanicalRuleDefinition,
) {
  return {
    id: ruleDefinition.id,
    type: "mechanical" as const,
    severity: ruleDefinition.severity,
    description: ruleDefinition.description,
    message: ruleDefinition.message,
    sourcePath: ruleFilePath,
  };
}

function createReplacementEntries(ruleMap: Record<string, string>): readonly ReplacementEntry[] {
  return Object.entries(ruleMap).map(([discouraged, replacement]) => ({
    discouraged,
    replacement,
  }));
}

function formatRuleIssue(issue: ZodIssue): string {
  const issuePath = issue.path.map(String).join(".");
  return issuePath.length === 0 ? issue.message : `${issuePath}: ${issue.message}`;
}

function readYamlErrorText(errors: readonly Error[]): string {
  return errors.map((error) => error.message).join(" ");
}

function readErrorDetails(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown rule loading failure.";
}

function createMissingRulesError(ruleDirectoryPath: string): AppError {
  return createRuleError(
    `VoiceLint rule files not found under ${ruleDirectoryPath}. Run \`voicelint init\` to create the baseline repo-local setup.`,
  );
}

function createRuleReadError(ruleFilePath: string, details: string): AppError {
  return createRuleError(`Unable to read VoiceLint rule at ${ruleFilePath}: ${details}`);
}

function createRuleParseError(ruleFilePath: string, details: string): AppError {
  return createRuleError(`Unable to parse VoiceLint rule at ${ruleFilePath}: ${details}`);
}

function createSemanticRuleError(ruleFilePath: string): AppError {
  return createRuleError(
    `Semantic VoiceLint rules are not supported in v0.1: ${ruleFilePath}`,
  );
}

function createInvalidRegexError(
  ruleFilePath: string,
  pattern: string,
  details: string,
): AppError {
  return createRuleError(
    `Invalid regex in VoiceLint rule at ${ruleFilePath}: ${pattern}. ${details}`,
  );
}

function createRuleValidationError(
  ruleFilePath: string,
  details: readonly string[],
): AppError {
  return createRuleError([
    `Invalid VoiceLint rule at ${ruleFilePath}:`,
    ...details.map((detail) => `- ${detail}`),
  ].join("\n"));
}

function createRuleError(message: string): AppError {
  return {
    exitCode: exitCodes.failure,
    message,
  };
}
