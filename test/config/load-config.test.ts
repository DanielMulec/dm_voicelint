import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadVoiceLintConfig } from "../../src/config/load-config.js";
import {
  createTemporaryWorkspace,
  removeWorkspace,
  writeWorkspaceFile,
} from "../input/test-helpers.js";

const workspacePaths: string[] = [];

describe("loadVoiceLintConfig", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("parses a valid config", async () => {
    const workspacePath = await createWorkspace();
    await writeConfigFile(workspacePath, createValidConfigText());

    const configResult = await loadVoiceLintConfig(undefined, { cwd: workspacePath });

    expect(configResult).toMatchObject({
      ok: true,
      value: {
        configFilePath: join(workspacePath, "voicelint.config.yml"),
        profile: "product",
        rules: {
          "style.no-em-dash": "error",
          "style.no-en-dash": "warning",
          "copy.avoid-generic-product-words": "warning",
          "product.preferred-terms": "warning",
        },
        include: ["**/*.md", "**/*.mdx", "**/*.txt"],
        exclude: ["node_modules/**", "dist/**", "coverage/**"],
      },
    });
  });

  it("returns a config error for invalid YAML", async () => {
    const workspacePath = await createWorkspace();
    await writeConfigFile(workspacePath, "profile: product\nrules:\n  style.no-em-dash: [\n");

    const configResult = await loadVoiceLintConfig(undefined, { cwd: workspacePath });

    expect(configResult.ok).toBe(false);
    expect(configResult.ok ? "" : configResult.error.message).toContain(
      "Unable to parse VoiceLint config",
    );
  });

  it("returns a clear error when the config file is missing", async () => {
    const workspacePath = await createWorkspace();

    const configResult = await loadVoiceLintConfig(undefined, { cwd: workspacePath });

    expect(configResult.ok).toBe(false);
    expect(configResult.ok ? "" : configResult.error.message).toContain(
      "VoiceLint config not found",
    );
    expect(configResult.ok ? "" : configResult.error.message).toContain("voicelint init");
  });

  it("rejects unknown severities", async () => {
    const workspacePath = await createWorkspace();
    await writeConfigFile(
      workspacePath,
      createValidConfigText().replace("style.no-en-dash: warning", "style.no-en-dash: critical"),
    );

    const configResult = await loadVoiceLintConfig(undefined, { cwd: workspacePath });

    expect(configResult.ok).toBe(false);
    expect(configResult.ok ? "" : configResult.error.message).toContain(
      "rules.style.no-en-dash",
    );
  });

  it("rejects unknown rule ids", async () => {
    const workspacePath = await createWorkspace();
    await writeConfigFile(
      workspacePath,
      [
        "profile: product",
        "",
        "rules:",
        "  product.unknown-rule: error",
        "",
      ].join("\n"),
    );

    const configResult = await loadVoiceLintConfig(undefined, { cwd: workspacePath });

    expect(configResult.ok).toBe(false);
    expect(configResult.ok ? "" : configResult.error.message).toContain("product.unknown-rule");
  });
});

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-config-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}

async function writeConfigFile(workspacePath: string, content: string): Promise<void> {
  await writeWorkspaceFile(workspacePath, "voicelint.config.yml", content);
}

function createValidConfigText(): string {
  return [
    "profile: product",
    "",
    "rules:",
    "  style.no-em-dash: error",
    "  style.no-en-dash: warning",
    "  copy.avoid-generic-product-words: warning",
    "  product.preferred-terms: warning",
    "",
    "include:",
    '  - "**/*.md"',
    '  - "**/*.mdx"',
    '  - "**/*.txt"',
    "",
    "exclude:",
    '  - "node_modules/**"',
    '  - "dist/**"',
    '  - "coverage/**"',
    "",
  ].join("\n");
}
