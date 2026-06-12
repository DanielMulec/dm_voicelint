import { z } from "zod";

import { ruleSeverityValues } from "../rules/rule-schema.js";

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

export const configSeverityValues = ruleSeverityValues;
export type ConfigRuleSeverity = (typeof configSeverityValues)[number];

const nonEmptyStringSchema = z.string().trim().min(1);
const ruleSeveritySchema = z.enum(configSeverityValues);
const globListSchema = z.array(nonEmptyStringSchema);
const rulesOverrideSchema = z.record(nonEmptyStringSchema, ruleSeveritySchema);

export const voiceLintConfigSchema = z.object({
  profile: nonEmptyStringSchema,
  rules: rulesOverrideSchema.optional().default({}),
  include: globListSchema.optional().default([...defaultConfigIncludeGlobs]),
  exclude: globListSchema.optional().default([...defaultConfigExcludeGlobs]),
}).strict();

export type VoiceLintConfig = z.infer<typeof voiceLintConfigSchema>;
