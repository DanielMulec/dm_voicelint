import {
  defaultConfigExcludeGlobs,
  defaultConfigFilePath,
  defaultConfigIncludeGlobs,
  defaultConfigProfile,
} from "../config/config-schema.js";

export interface BaselineFile {
  readonly path: string;
  readonly content: string;
}

export function createBaselineFiles(): readonly BaselineFile[] {
  return [
    {
      path: defaultConfigFilePath,
      content: createBaselineConfigContent(),
    },
    createRuleFile(
      "voicelint/rules/style.no-em-dash.yml",
      createNoEmDashRuleContent(),
    ),
    createRuleFile(
      "voicelint/rules/style.no-en-dash.yml",
      createNoEnDashRuleContent(),
    ),
    createRuleFile(
      "voicelint/rules/copy.avoid-generic-product-words.yml",
      createGenericProductWordsRuleContent(),
    ),
    createRuleFile(
      "voicelint/rules/product.preferred-terms.yml",
      createPreferredTermsRuleContent(),
    ),
  ];
}

function createRuleFile(path: string, content: string): BaselineFile {
  return { path, content };
}

function createBaselineConfigContent(): string {
  return [
    `profile: ${defaultConfigProfile}`,
    "",
    "rules:",
    "  style.no-em-dash: error",
    "  style.no-en-dash: warning",
    "  copy.avoid-generic-product-words: warning",
    "  product.preferred-terms: warning",
    "",
    "include:",
    ...defaultConfigIncludeGlobs.map(createConfigListItem),
    "",
    "exclude:",
    ...defaultConfigExcludeGlobs.map(createConfigListItem),
    "",
  ].join("\n");
}

function createConfigListItem(globPattern: string): string {
  return `  - "${globPattern}"`;
}

function createNoEmDashRuleContent(): string {
  return [
    "id: style.no-em-dash",
    "type: mechanical",
    "severity: error",
    "description: Do not use em dashes.",
    "",
    "match:",
    '  pattern: "—"',
    "",
    'message: "Use a comma, colon, parentheses, or a sentence break instead of an em dash."',
    "",
  ].join("\n");
}

function createNoEnDashRuleContent(): string {
  return [
    "id: style.no-en-dash",
    "type: mechanical",
    "severity: error",
    "description: Do not use en dashes.",
    "",
    "match:",
    '  pattern: "–"',
    "",
    'message: "Use to, through, a hyphen, or explicit punctuation instead of an en dash."',
    "",
  ].join("\n");
}

function createGenericProductWordsRuleContent(): string {
  return [
    "id: copy.avoid-generic-product-words",
    "type: mechanical",
    "severity: warning",
    "description: Avoid generic product-copy words that do not name a concrete workflow.",
    "",
    "substitution:",
    '  "seamless": "specific workflow description"',
    '  "revolutionary": "concrete claim"',
    '  "world-class": "concrete claim"',
    '  "next-generation": "concrete claim"',
    "",
    'message: "Replace generic product-copy language with a concrete claim."',
    "",
  ].join("\n");
}

function createPreferredTermsRuleContent(): string {
  return [
    "id: product.preferred-terms",
    "type: mechanical",
    "severity: warning",
    "description: Use approved VoiceLint terminology.",
    "",
    "terms:",
    '  "AI assistant": "agent"',
    '  "auto rewrite": "suggestion"',
    "",
    'message: "Use approved VoiceLint terminology."',
    "",
  ].join("\n");
}
