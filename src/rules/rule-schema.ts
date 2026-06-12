import { z } from "zod";

export const ruleSeverityValues = ["error", "warning"] as const;

export type RuleSeverity = (typeof ruleSeverityValues)[number];

const nonEmptyStringSchema = z.string().trim().min(1);
const ruleMapSchema = z
  .record(nonEmptyStringSchema, nonEmptyStringSchema)
  .refine(hasRuleEntries, {
    message: "Rule maps must contain at least one entry.",
  });

const sharedRuleFields = {
  id: nonEmptyStringSchema,
  type: z.literal("mechanical"),
  severity: z.enum(ruleSeverityValues),
  description: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
} as const;

export const mechanicalRuleDefinitionSchema = z.union([
  z.object({
    ...sharedRuleFields,
    match: z.object({
      pattern: nonEmptyStringSchema,
      regex: z.literal(true).optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...sharedRuleFields,
    terms: ruleMapSchema,
  }).strict(),
  z.object({
    ...sharedRuleFields,
    substitution: ruleMapSchema,
  }).strict(),
]);

export type MechanicalRuleDefinition = z.infer<typeof mechanicalRuleDefinitionSchema>;

export interface ReplacementEntry {
  readonly discouraged: string;
  readonly replacement: string;
}

export interface LoadedMechanicalRuleBase {
  readonly id: string;
  readonly type: "mechanical";
  readonly severity: RuleSeverity;
  readonly description: string;
  readonly message: string;
  readonly sourcePath: string;
}

export interface LiteralPatternMatcher {
  readonly pattern: string;
  readonly regex: false;
}

export interface RegexPatternMatcher {
  readonly pattern: string;
  readonly regex: true;
  readonly expression: RegExp;
}

export type PatternMatcher = LiteralPatternMatcher | RegexPatternMatcher;

export interface LoadedPatternRule extends LoadedMechanicalRuleBase {
  readonly kind: "pattern";
  readonly matcher: PatternMatcher;
}

export interface LoadedTermsRule extends LoadedMechanicalRuleBase {
  readonly kind: "terms";
  readonly terms: readonly ReplacementEntry[];
}

export interface LoadedSubstitutionRule extends LoadedMechanicalRuleBase {
  readonly kind: "substitution";
  readonly substitutions: readonly ReplacementEntry[];
}

export type LoadedMechanicalRule =
  | LoadedPatternRule
  | LoadedTermsRule
  | LoadedSubstitutionRule;

function hasRuleEntries(ruleMap: Record<string, string>): boolean {
  return Object.keys(ruleMap).length > 0;
}
