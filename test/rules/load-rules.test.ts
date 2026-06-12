import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadRules } from "../../src/rules/load-rules.js";
import {
  createTemporaryWorkspace,
  removeWorkspace,
  writeWorkspaceFile,
} from "../input/test-helpers.js";

const workspacePaths: string[] = [];

describe("loadRules", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("loads valid rule files", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "voicelint.config.yml", "profile: product\n");
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/style.no-em-dash.yml",
      createPatternRuleText("style.no-em-dash", "error", '  pattern: "—"'),
    );
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/product.preferred-terms.yml",
      createTermsRuleText(),
    );
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/copy.avoid-generic-product-words.yml",
      createSubstitutionRuleText(),
    );

    const loadRulesResult = await loadRules(join(workspacePath, "voicelint.config.yml"));

    expect(loadRulesResult).toMatchObject({
      ok: true,
      value: [
        {
          id: "copy.avoid-generic-product-words",
          kind: "substitution",
          severity: "warning",
        },
        {
          id: "product.preferred-terms",
          kind: "terms",
          severity: "warning",
        },
        {
          id: "style.no-em-dash",
          kind: "pattern",
          severity: "error",
        },
      ],
    });
  });

  it("rejects invalid rule files", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "voicelint.config.yml", "profile: product\n");
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/style.no-em-dash.yml",
      [
        "id: style.no-em-dash",
        "type: mechanical",
        "severity: error",
        "description: Broken rule.",
        "",
        "match:",
        '  pattern: "—"',
        "",
      ].join("\n"),
    );

    const loadRulesResult = await loadRules(join(workspacePath, "voicelint.config.yml"));

    expect(loadRulesResult.ok).toBe(false);
    expect(loadRulesResult.ok ? "" : loadRulesResult.error.message).toContain(
      "Invalid VoiceLint rule",
    );
  });

  it("rejects semantic rule files in v0.1", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "voicelint.config.yml", "profile: product\n");
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/voice.no-fake-empathy.yml",
      [
        "id: voice.no-fake-empathy",
        "type: semantic",
        "severity: warning",
        "description: Deferred semantic rule.",
        'message: "Do not use fake empathy."',
        "",
      ].join("\n"),
    );

    const loadRulesResult = await loadRules(join(workspacePath, "voicelint.config.yml"));

    expect(loadRulesResult.ok).toBe(false);
    expect(loadRulesResult.ok ? "" : loadRulesResult.error.message).toContain(
      "Semantic VoiceLint rules are not supported in v0.1",
    );
  });

  it("returns a safe invalid-regex error", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "voicelint.config.yml", "profile: product\n");
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/style.invalid-regex.yml",
      createPatternRuleText("style.invalid-regex", "error", '  pattern: "["\n  regex: true'),
    );

    const loadRulesResult = await loadRules(join(workspacePath, "voicelint.config.yml"));

    expect(loadRulesResult.ok).toBe(false);
    expect(loadRulesResult.ok ? "" : loadRulesResult.error.message).toContain(
      "Invalid regex in VoiceLint rule",
    );
  });
});

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-rules-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}

function createPatternRuleText(
  ruleId: string,
  severity: "error" | "warning",
  matchLines: string,
): string {
  return [
    `id: ${ruleId}`,
    "type: mechanical",
    `severity: ${severity}`,
    "description: Pattern rule.",
    "",
    "match:",
    matchLines,
    "",
    'message: "Pattern match."',
    "",
  ].join("\n");
}

function createTermsRuleText(): string {
  return [
    "id: product.preferred-terms",
    "type: mechanical",
    "severity: warning",
    "description: Terms rule.",
    "",
    "terms:",
    '  "AI assistant": "agent"',
    "",
    'message: "Use approved VoiceLint terminology."',
    "",
  ].join("\n");
}

function createSubstitutionRuleText(): string {
  return [
    "id: copy.avoid-generic-product-words",
    "type: mechanical",
    "severity: warning",
    "description: Substitution rule.",
    "",
    "substitution:",
    '  "seamless": "specific workflow description"',
    "",
    'message: "Replace generic wording."',
    "",
  ].join("\n");
}
