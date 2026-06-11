import { z } from "zod";

export const defaultConfigFilePath = "voicelint.config.yml";
export const defaultConfigProfile = "product";

export const defaultConfigIncludeGlobs = [
  "**/*.md",
  "**/*.mdx",
  "**/*.txt",
] as const;

export const defaultConfigExcludeGlobs = [
  "node_modules/**",
  "dist/**",
  "coverage/**",
] as const;

export const knownRuleIds = [
  "style.no-em-dash",
  "style.no-en-dash",
  "copy.avoid-generic-product-words",
  "product.preferred-terms",
] as const;

export const configSeverityValues = ["error", "warning", "off"] as const;

export type KnownRuleId = (typeof knownRuleIds)[number];
export type ConfigRuleSeverity = (typeof configSeverityValues)[number];

const nonEmptyStringSchema = z.string().trim().min(1);
const ruleSeveritySchema = z.enum(configSeverityValues);
const globListSchema = z.array(nonEmptyStringSchema);

const rulesOverrideSchema = z.object({
  "style.no-em-dash": ruleSeveritySchema.optional(),
  "style.no-en-dash": ruleSeveritySchema.optional(),
  "copy.avoid-generic-product-words": ruleSeveritySchema.optional(),
  "product.preferred-terms": ruleSeveritySchema.optional(),
}).strict();

export const voiceLintConfigSchema = z.object({
  profile: nonEmptyStringSchema,
  rules: rulesOverrideSchema.optional().default({}),
  include: globListSchema.optional().default([...defaultConfigIncludeGlobs]),
  exclude: globListSchema.optional().default([...defaultConfigExcludeGlobs]),
}).strict();

export type VoiceLintConfig = z.infer<typeof voiceLintConfigSchema>;
