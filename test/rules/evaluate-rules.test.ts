import { describe, expect, it } from "vitest";

import { evaluateRules } from "../../src/rules/evaluate-rules.js";
import type {
  LoadedPatternRule,
  LoadedSubstitutionRule,
  LoadedTermsRule,
} from "../../src/rules/rule-schema.js";
import type { TextSource } from "../../src/input/read-source.js";

describe("evaluateRules", () => {
  it("finds literal pattern matches", () => {
    const diagnostics = evaluateRules(
      [createSource("README.md", "Before — after\n")],
      [createLiteralPatternRule("style.no-em-dash", "—")],
      "product",
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        file: "README.md",
        line: 1,
        column: 8,
        endLine: 1,
        endColumn: 9,
        ruleId: "style.no-em-dash",
        severity: "error",
      }),
    ]);
  });

  it("finds regex pattern matches", () => {
    const diagnostics = evaluateRules(
      [createSource("README.md", "agent\nagent\n")],
      [createRegexPatternRule("product.agent-word", "\\bagent\\b")],
      "product",
    );

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map((diagnostic) => diagnostic.line)).toEqual([1, 2]);
  });

  it("creates preferred-term suggestions with case-sensitive matching", () => {
    const diagnostics = evaluateRules(
      [createSource("README.md", "AI assistant and ai assistant\n")],
      [createTermsRule()],
      "product",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      column: 1,
      suggestion: 'Use "agent" instead of "AI assistant".',
    });
  });

  it("creates substitution suggestions", () => {
    const diagnostics = evaluateRules(
      [createSource("README.md", "A seamless workflow.\n")],
      [createSubstitutionRule()],
      "product",
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        suggestion: 'Replace "seamless" with "specific workflow description".',
      }),
    ]);
  });

  it("reports multiple diagnostics in one file in deterministic order", () => {
    const diagnostics = evaluateRules(
      [createSource("README.md", "— then –\n")],
      [
        createLiteralPatternRule("style.no-en-dash", "–"),
        createLiteralPatternRule("style.no-em-dash", "—"),
      ],
      "product",
    );

    expect(diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual([
      "style.no-em-dash",
      "style.no-en-dash",
    ]);
  });

  it("does not duplicate diagnostics for plain-text line and paragraph segments", () => {
    const diagnostics = evaluateRules(
      [createSource("notes.txt", "seamless workflow\n")],
      [createSubstitutionRule()],
      "product",
    );

    expect(diagnostics).toHaveLength(1);
  });
});

function createSource(path: string, content: string): TextSource {
  return {
    path,
    content,
    origin: "filesystem",
  };
}

function createLiteralPatternRule(
  ruleId: string,
  pattern: string,
): LoadedPatternRule {
  return {
    id: ruleId,
    type: "mechanical",
    kind: "pattern",
    severity: "error",
    description: "Pattern rule.",
    message: "Pattern match.",
    sourcePath: `<memory>/${ruleId}.yml`,
    matcher: {
      pattern,
      regex: false,
    },
  };
}

function createRegexPatternRule(
  ruleId: string,
  pattern: string,
): LoadedPatternRule {
  return {
    ...createLiteralPatternRule(ruleId, pattern),
    matcher: {
      pattern,
      regex: true,
      expression: new RegExp(pattern, "gu"),
    },
  };
}

function createTermsRule(): LoadedTermsRule {
  return {
    id: "product.preferred-terms",
    type: "mechanical",
    kind: "terms",
    severity: "warning",
    description: "Terms rule.",
    message: "Use approved VoiceLint terminology.",
    sourcePath: "<memory>/product.preferred-terms.yml",
    terms: [
      {
        discouraged: "AI assistant",
        replacement: "agent",
      },
    ],
  };
}

function createSubstitutionRule(): LoadedSubstitutionRule {
  return {
    id: "copy.avoid-generic-product-words",
    type: "mechanical",
    kind: "substitution",
    severity: "warning",
    description: "Substitution rule.",
    message: "Replace generic wording.",
    sourcePath: "<memory>/copy.avoid-generic-product-words.yml",
    substitutions: [
      {
        discouraged: "seamless",
        replacement: "specific workflow description",
      },
    ],
  };
}
