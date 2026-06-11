import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { executeInitCommand } from "../../src/commands/init.js";
import {
  createTemporaryWorkspace,
  removeWorkspace,
  writeWorkspaceFile,
} from "../input/test-helpers.js";

const workspacePaths: string[] = [];
const baselineFixturePaths = [
  "voicelint.config.yml",
  "voicelint/rules/style.no-em-dash.yml",
  "voicelint/rules/style.no-en-dash.yml",
  "voicelint/rules/copy.avoid-generic-product-words.yml",
  "voicelint/rules/product.preferred-terms.yml",
] as const;

describe("executeInitCommand", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("creates the baseline config and rule files", async () => {
    const workspacePath = await createWorkspace();

    const commandResult = await executeInitCommand(
      { commandName: "init", agent: null },
      { cwd: workspacePath },
    );

    expect(commandResult).toMatchObject({
      ok: true,
      value: { exitCode: 0 },
    });
    expect(commandResult.ok ? commandResult.value.stdoutText : "").toContain(
      "Created: voicelint.config.yml",
    );

    await expectWorkspaceToMatchFixtures(workspacePath);
  });

  it("is idempotent when the baseline is already present", async () => {
    const workspacePath = await createWorkspace();

    await executeInitCommand({ commandName: "init", agent: null }, { cwd: workspacePath });
    const commandResult = await executeInitCommand(
      { commandName: "init", agent: null },
      { cwd: workspacePath },
    );

    expect(commandResult).toMatchObject({
      ok: true,
      value: { exitCode: 0 },
    });
    expect(commandResult.ok ? commandResult.value.stdoutText : "").toContain(
      "VoiceLint init baseline is already present.",
    );
    expect(commandResult.ok ? commandResult.value.stdoutText : "").toContain(
      "Skipped: voicelint.config.yml",
    );
  });

  it("does not overwrite modified existing files", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "voicelint/rules/style.no-em-dash.yml", "custom\n");

    const commandResult = await executeInitCommand(
      { commandName: "init", agent: null },
      { cwd: workspacePath },
    );

    expect(commandResult).toMatchObject({
      ok: true,
      value: { exitCode: 2 },
    });
    expect(commandResult.ok ? commandResult.value.stderrText : "").toContain(
      "Conflict: voicelint/rules/style.no-em-dash.yml",
    );
    await expect(
      readFile(join(workspacePath, "voicelint/rules/style.no-em-dash.yml"), "utf8"),
    ).resolves.toBe("custom\n");
    await expect(pathExists(join(workspacePath, "voicelint.config.yml"))).resolves.toBe(false);
  });
});

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-init-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}

async function expectWorkspaceToMatchFixtures(workspacePath: string): Promise<void> {
  for (const baselineFixturePath of baselineFixturePaths) {
    const expectedContent = await readFixtureFile(baselineFixturePath);
    const actualContent = await readFile(join(workspacePath, baselineFixturePath), "utf8");
    expect(actualContent).toBe(expectedContent);
  }
}

async function readFixtureFile(relativePath: string): Promise<string> {
  return readFile(new URL(`../fixtures/init/${relativePath}`, import.meta.url), "utf8");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
