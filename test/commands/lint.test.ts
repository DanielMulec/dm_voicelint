import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { executeLintCommand } from "../../src/commands/lint.js";
import {
  createTemporaryWorkspace,
  removeWorkspace,
  writeWorkspaceFile,
} from "../input/test-helpers.js";

const workspacePaths: string[] = [];
const lintJsonSchema = z.object({
  diagnostics: z.array(
    z.object({
      ruleId: z.string(),
      severity: z.string(),
    }),
  ),
});
const lintErrorSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
});

describe("executeLintCommand", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("applies config severity overrides over rule file severity", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(
      workspacePath,
      "voicelint.config.yml",
      [
        "profile: product",
        "",
        "rules:",
        "  style.no-en-dash: error",
        "",
      ].join("\n"),
    );
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/style.no-en-dash.yml",
      [
        "id: style.no-en-dash",
        "type: mechanical",
        "severity: warning",
        "description: Do not use en dashes.",
        "",
        "match:",
        '  pattern: "–"',
        "",
        'message: "Do not use en dashes."',
        "",
      ].join("\n"),
    );
    await writeWorkspaceFile(workspacePath, "README.md", "alpha – beta\n");

    const commandResult = await executeLintCommand(
      {
        commandName: "lint",
        requestedInputMode: "paths",
        pathArgs: ["README.md"],
        format: "json",
      },
      createEmptyInput(),
      { cwd: workspacePath },
    );

    expect(commandResult).toMatchObject({
      ok: true,
      value: { exitCode: 1 },
    });
    const jsonOutput = lintJsonSchema.parse(
      JSON.parse(commandResult.ok ? commandResult.value.stdoutText ?? "" : "") as unknown,
    );
    expect(jsonOutput.diagnostics).toEqual([
      expect.objectContaining({
        ruleId: "style.no-en-dash",
        severity: "error",
      }),
    ]);
  });

  it("fails when config references an unknown rule id", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(
      workspacePath,
      "voicelint.config.yml",
      [
        "profile: product",
        "",
        "rules:",
        "  product.unknown-rule: error",
        "",
      ].join("\n"),
    );
    await writeWorkspaceFile(
      workspacePath,
      "voicelint/rules/style.no-em-dash.yml",
      [
        "id: style.no-em-dash",
        "type: mechanical",
        "severity: error",
        "description: Do not use em dashes.",
        "",
        "match:",
        '  pattern: "—"',
        "",
        'message: "Do not use em dashes."',
        "",
      ].join("\n"),
    );
    await writeWorkspaceFile(workspacePath, "README.md", "alpha — beta\n");

    const commandResult = await executeLintCommand(
      {
        commandName: "lint",
        requestedInputMode: "paths",
        pathArgs: ["README.md"],
        format: "json",
      },
      createEmptyInput(),
      { cwd: workspacePath },
    );

    expect(commandResult).toMatchObject({
      ok: true,
      value: { exitCode: 2 },
    });
    const jsonOutput = lintErrorSchema.parse(
      JSON.parse(commandResult.ok ? commandResult.value.stdoutText ?? "" : "") as unknown,
    );
    expect(jsonOutput.error.message).toContain("product.unknown-rule");
  });
});

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-lint-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}

function createEmptyInput(): PassThrough {
  const input = new PassThrough();
  input.end();
  return input;
}
