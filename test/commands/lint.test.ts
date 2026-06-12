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
  summary: z.object({
    scannedFileCount: z.number(),
    diagnosticCount: z.number(),
    errorCount: z.number(),
    warningCount: z.number(),
    exitCode: z.number(),
  }),
  diagnostics: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
      endLine: z.number(),
      endColumn: z.number(),
      profile: z.string(),
      ruleId: z.string(),
      severity: z.enum(["error", "warning"]),
      message: z.string(),
      suggestion: z.string().optional(),
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

  it("returns exit 0 when diagnostics are warnings only", async () => {
    const workspacePath = await createWorkspace();
    await writeSingleRuleWorkspace(workspacePath, "warning");
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
      value: { exitCode: 0 },
    });
    const jsonOutput = parseLintJsonOutput(commandResult);
    expect(jsonOutput.summary).toEqual({
      scannedFileCount: 1,
      diagnosticCount: 1,
      errorCount: 0,
      warningCount: 1,
      exitCode: 0,
    });
  });

  it("returns exit 1 when an error diagnostic is present", async () => {
    const workspacePath = await createWorkspace();
    await writeSingleRuleWorkspace(workspacePath, "error");
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
      value: { exitCode: 1 },
    });
    const jsonOutput = parseLintJsonOutput(commandResult);
    expect(jsonOutput.summary).toEqual({
      scannedFileCount: 1,
      diagnosticCount: 1,
      errorCount: 1,
      warningCount: 0,
      exitCode: 1,
    });
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
    const jsonOutput = parseLintJsonOutput(commandResult);
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

function parseLintJsonOutput(
  commandResult: Awaited<ReturnType<typeof executeLintCommand>>,
): z.infer<typeof lintJsonSchema> {
  return lintJsonSchema.parse(
    JSON.parse(commandResult.ok ? commandResult.value.stdoutText ?? "" : "") as unknown,
  );
}

async function writeSingleRuleWorkspace(
  workspacePath: string,
  severity: "error" | "warning",
): Promise<void> {
  await writeWorkspaceFile(
    workspacePath,
    "voicelint.config.yml",
    [
      "profile: product",
      "",
      "rules:",
      `  style.no-em-dash: ${severity}`,
      "",
    ].join("\n"),
  );
  await writeWorkspaceFile(
    workspacePath,
    "voicelint/rules/style.no-em-dash.yml",
    [
      "id: style.no-em-dash",
      "type: mechanical",
      `severity: ${severity}`,
      "description: Do not use em dashes.",
      "",
      "match:",
      '  pattern: "—"',
      "",
      'message: "Do not use em dashes."',
      "",
    ].join("\n"),
  );
}
