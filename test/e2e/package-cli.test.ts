import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createFixtureWorkspace,
  ensureBuiltCli,
  readRepositoryRootPath,
  removeWorkspace,
  runGitCommand,
  runPackagedCli,
} from "./test-helpers.js";

const workspacePaths: string[] = [];
const jsonOutputSchema = z.object({
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
      ruleId: z.string(),
      severity: z.enum(["error", "warning"]),
      message: z.string(),
    }),
  ),
});

describe.sequential("packaged CLI end to end", () => {
  beforeAll(() => {
    ensureBuiltCli();
  });

  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("executes the built bin like a package entrypoint", () => {
    const commandResult = runPackagedCli(["--help"], {
      cwd: readRepositoryRootPath(),
    });

    expect(commandResult.exitCode).toBe(0);
    expect(commandResult.stdoutText).toContain("VoiceLint");
    expect(commandResult.stdoutText).toContain("voicelint changed");
    expect(commandResult.stderrText).toBe("");
  });

  it("runs init and lints a clean fixture", async () => {
    const workspacePath = await createWorkspace("basic");

    const initResult = runPackagedCli(["init"], { cwd: workspacePath });
    const lintResult = runPackagedCli(["docs/clean.md", "--format", "pretty"], {
      cwd: workspacePath,
    });

    expect(initResult.exitCode).toBe(0);
    expect(initResult.stdoutText).toContain("Created: voicelint.config.yml");
    expect(lintResult.exitCode).toBe(0);
    expect(lintResult.stdoutText).toBe("0 errors, 0 warnings in 1 file\n");
    expect(lintResult.stderrText).toBe("");
  });

  it("runs init and lints a bad fixture", async () => {
    const workspacePath = await createWorkspace("basic");
    runPackagedCli(["init"], { cwd: workspacePath });

    const lintResult = runPackagedCli(["docs/bad.md", "--format", "pretty"], {
      cwd: workspacePath,
    });

    expect(lintResult.exitCode).toBe(1);
    expect(lintResult.stdoutText).toContain("docs/bad.md:1:11");
    expect(lintResult.stdoutText).toContain("style.no-em-dash");
    expect(lintResult.stdoutText).toContain("copy.avoid-generic-product-words");
    expect(lintResult.stdoutText).toContain("product.preferred-terms");
  });

  it("handles ignored Markdown in a package workflow", async () => {
    const workspacePath = await createWorkspace("with-ignores");
    runPackagedCli(["init"], { cwd: workspacePath });

    const lintResult = runPackagedCli(["docs/ignored.md", "--format", "pretty"], {
      cwd: workspacePath,
    });

    expect(lintResult.exitCode).toBe(0);
    expect(lintResult.stdoutText).toBe("0 errors, 0 warnings in 1 file\n");
  });

  it("lints changed files in a git fixture", async () => {
    const workspacePath = await createInitializedGitWorkspace("git-changed");
    await writeFile(
      join(workspacePath, "docs/tracked.md"),
      "This changed doc uses — punctuation.\n",
      "utf8",
    );
    await writeFile(
      join(workspacePath, "docs/untracked.md"),
      "A seamless workflow appeared.\n",
      "utf8",
    );

    const lintResult = runPackagedCli(["changed", "--format", "json"], {
      cwd: workspacePath,
    });
    const jsonOutput = parseJsonOutput(lintResult.stdoutText);

    expect(lintResult.exitCode).toBe(1);
    expect(jsonOutput.summary.diagnosticCount).toBe(2);
    expect(jsonOutput.diagnostics).toEqual([
      expect.objectContaining({
        file: "docs/tracked.md",
        ruleId: "style.no-em-dash",
        severity: "error",
      }),
      expect.objectContaining({
        file: "docs/untracked.md",
        ruleId: "copy.avoid-generic-product-words",
        severity: "warning",
      }),
    ]);
  });

  it("lints staged files from the index", async () => {
    const workspacePath = await createInitializedGitWorkspace("git-staged");
    const stagedFilePath = join(workspacePath, "docs/staged.md");

    await writeFile(stagedFilePath, "The staged doc uses — punctuation.\n", "utf8");
    runGitCommand(workspacePath, ["add", "docs/staged.md"]);
    await writeFile(stagedFilePath, "The working tree is already clean.\n", "utf8");

    const lintResult = runPackagedCli(["staged", "--format", "json"], {
      cwd: workspacePath,
    });
    const jsonOutput = parseJsonOutput(lintResult.stdoutText);

    expect(lintResult.exitCode).toBe(1);
    expect(jsonOutput.diagnostics).toEqual([
      expect.objectContaining({
        file: "docs/staged.md",
        ruleId: "style.no-em-dash",
        severity: "error",
      }),
    ]);
  });

  it("lints stdin content through the packaged CLI", async () => {
    const workspacePath = await createWorkspace("basic");
    runPackagedCli(["init"], { cwd: workspacePath });

    const lintResult = runPackagedCli(
      ["--stdin", "--stdin-file-path", "docs/stdin.md", "--format", "pretty"],
      {
        cwd: workspacePath,
        inputText: "A seamless AI assistant workflow — here.\n",
      },
    );

    expect(lintResult.exitCode).toBe(1);
    expect(lintResult.stdoutText).toContain("docs/stdin.md:1:34");
    expect(lintResult.stdoutText).toContain("style.no-em-dash");
  });

  it("emits parseable json output from the package CLI", async () => {
    const workspacePath = await createWorkspace("basic");
    runPackagedCli(["init"], { cwd: workspacePath });

    const lintResult = runPackagedCli(["docs/bad.md", "--format", "json"], {
      cwd: workspacePath,
    });
    const jsonOutput = parseJsonOutput(lintResult.stdoutText);

    expect(lintResult.exitCode).toBe(1);
    expect(jsonOutput.summary).toEqual({
      scannedFileCount: 1,
      diagnosticCount: 3,
      errorCount: 1,
      warningCount: 2,
      exitCode: 1,
    });
  });

  it("emits concise agent diagnostics from the package CLI", async () => {
    const workspacePath = await createWorkspace("basic");
    runPackagedCli(["init"], { cwd: workspacePath });

    const lintResult = runPackagedCli(["docs/bad.md", "--format", "agent"], {
      cwd: workspacePath,
    });

    expect(lintResult.exitCode).toBe(1);
    expect(lintResult.stdoutText).toContain(
      "docs/bad.md:1:11 [error] style.no-em-dash",
    );
    expect(lintResult.stdoutText).toContain("Summary: 1 error, 2 warnings in 1 file");
    expect(lintResult.stderrText).toBe("");
  });
});

async function createWorkspace(fixtureName: string): Promise<string> {
  const workspacePath = await createFixtureWorkspace(fixtureName);
  workspacePaths.push(workspacePath);
  return workspacePath;
}

async function createInitializedGitWorkspace(
  fixtureName: string,
): Promise<string> {
  const workspacePath = await createWorkspace(fixtureName);
  runGitCommand(workspacePath, ["init"]);
  runGitCommand(workspacePath, ["config", "user.name", "VoiceLint E2E"]);
  runGitCommand(workspacePath, ["config", "user.email", "voicelint-e2e@example.com"]);
  runPackagedCli(["init"], { cwd: workspacePath });
  runGitCommand(workspacePath, ["add", "."]);
  runGitCommand(workspacePath, ["commit", "-m", "Baseline"]);
  return workspacePath;
}

function parseJsonOutput(outputText: string): z.infer<typeof jsonOutputSchema> {
  return jsonOutputSchema.parse(JSON.parse(outputText) as unknown);
}
