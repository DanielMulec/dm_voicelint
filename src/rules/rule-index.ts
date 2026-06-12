import { exitCodes } from "../cli/exit-code.js";
import type { AppError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import type { ConfigRuleSeverity } from "../config/config-schema.js";
import type { LoadedMechanicalRule } from "./rule-schema.js";

export interface RuleIndex {
  readonly rules: readonly LoadedMechanicalRule[];
  readonly rulesById: ReadonlyMap<string, LoadedMechanicalRule>;
}

export function createRuleIndex(
  loadedRules: readonly LoadedMechanicalRule[],
): Result<RuleIndex, AppError> {
  const rulesById = new Map<string, LoadedMechanicalRule>();

  for (const loadedRule of loadedRules) {
    const existingRule = rulesById.get(loadedRule.id);
    if (existingRule !== undefined) {
      return err(
        createDuplicateRuleIdError(loadedRule.id, [
          existingRule.sourcePath,
          loadedRule.sourcePath,
        ]),
      );
    }

    rulesById.set(loadedRule.id, loadedRule);
  }

  return ok({
    rules: loadedRules,
    rulesById,
  });
}

export function resolveConfiguredRules(
  ruleIndex: RuleIndex,
  configFilePath: string,
  configuredSeverities: Readonly<Record<string, ConfigRuleSeverity>>,
): Result<readonly LoadedMechanicalRule[], AppError> {
  const unknownRuleIds = Object.keys(configuredSeverities)
    .filter((ruleId) => !ruleIndex.rulesById.has(ruleId))
    .sort();

  if (unknownRuleIds.length > 0) {
    return err(createUnknownConfiguredRuleError(configFilePath, unknownRuleIds));
  }

  return ok(
    ruleIndex.rules.map((rule) => ({
      ...rule,
      severity: configuredSeverities[rule.id] ?? rule.severity,
    })),
  );
}

function createDuplicateRuleIdError(
  ruleId: string,
  rulePaths: readonly string[],
): AppError {
  return createRuleIndexError([
    `Duplicate VoiceLint rule id: ${ruleId}`,
    ...rulePaths.map((rulePath) => `- ${rulePath}`),
  ].join("\n"));
}

function createUnknownConfiguredRuleError(
  configFilePath: string,
  unknownRuleIds: readonly string[],
): AppError {
  return createRuleIndexError([
    `VoiceLint config references unknown rule ids at ${configFilePath}:`,
    ...unknownRuleIds.map((ruleId) => `- ${ruleId}`),
  ].join("\n"));
}

function createRuleIndexError(message: string): AppError {
  return {
    exitCode: exitCodes.failure,
    message,
  };
}
