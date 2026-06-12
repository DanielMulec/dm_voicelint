import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createPostToolUseHookScript,
  createStopHookScript,
} from "../../src/agents/codex/codex-hook-scripts.js";

const workspacePaths: string[] = [];
const hookOutputSchema = z.object({
  decision: z.literal("block").optional(),
  reason: z.string().optional(),
  continue: z.literal(true).optional(),
  hookSpecificOutput: z
    .object({
      hookEventName: z.literal("PostToolUse"),
      additionalContext: z.string(),
    })
    .optional(),
});

describe("Codex hook wrapper scripts", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("PostToolUse returns valid empty JSON when VoiceLint exits 0", async () => {
    const result = await runGeneratedHook(createPostToolUseHookScript(), { exitCode: 0 });

    expect(result.exitCode).toBe(0);
    expect(result.output).toEqual({});
  });

  it("PostToolUse returns block feedback JSON when VoiceLint exits 1", async () => {
    const result = await runGeneratedHook(createPostToolUseHookScript(), {
      exitCode: 1,
      stdoutText: "README.md:1:1 [error] style.no-em-dash Fix it.\nSummary: 1 error, 0 warnings in 1 file\n",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchObject({
      decision: "block",
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
      },
    });
    expect(result.output.reason).toContain("Fix these diagnostics");
    expect(result.output.reason).toContain("README.md:1:1");
  });

  it("PostToolUse returns setup failure JSON when VoiceLint exits 2", async () => {
    const result = await runGeneratedHook(createPostToolUseHookScript(), {
      exitCode: 2,
      stderrText: "VoiceLint config not found\n",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchObject({ decision: "block" });
    expect(result.output.reason).toContain("setup or config failed");
    expect(result.output.reason).toContain("VoiceLint config not found");
  });

  it("Stop returns continue JSON when VoiceLint exits 0", async () => {
    const result = await runGeneratedHook(createStopHookScript(), { exitCode: 0 });

    expect(result.exitCode).toBe(0);
    expect(result.stdoutText).toBe(`${JSON.stringify({ continue: true })}\n`);
    expect(result.output).toEqual({ continue: true });
  });

  it("Stop returns block JSON when VoiceLint exits 1", async () => {
    const result = await runGeneratedHook(createStopHookScript(), {
      exitCode: 1,
      stdoutText: "README.md:1:1 [error] style.no-em-dash Fix it.\n",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchObject({ decision: "block" });
    expect(result.output.reason).toContain("Run one more pass");
    expect(result.output.reason).toContain("README.md:1:1");
  });

  it("Stop returns setup failure block JSON when VoiceLint exits 2", async () => {
    const result = await runGeneratedHook(createStopHookScript(), {
      exitCode: 2,
      stderrText: "Bad config\n",
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toMatchObject({ decision: "block" });
    expect(result.output.reason).toContain("setup or config failed");
    expect(result.output.reason).toContain("Bad config");
  });

  it("Stop returns continue JSON when stop_hook_active is true", async () => {
    const result = await runGeneratedHook(createStopHookScript(), {
      exitCode: 1,
      stdinText: `${JSON.stringify({ stop_hook_active: true })}\n`,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdoutText).toBe(`${JSON.stringify({ continue: true })}\n`);
    expect(result.output).toEqual({ continue: true });
  });
});

interface FakeVoiceLintRun {
  readonly exitCode: number;
  readonly stdoutText?: string;
  readonly stderrText?: string;
  readonly stdinText?: string;
}

interface HookExecutionResult {
  readonly exitCode: number | null;
  readonly stdoutText: string;
  readonly output: z.infer<typeof hookOutputSchema>;
}

async function runGeneratedHook(
  scriptText: string,
  fakeRun: FakeVoiceLintRun,
): Promise<HookExecutionResult> {
  const workspacePath = await createWorkspace();
  const scriptPath = join(workspacePath, "hook.mjs");
  const binPath = join(workspacePath, "bin");
  await mkdir(binPath, { recursive: true });
  await writeFile(scriptPath, scriptText, "utf8");
  await writeFakeNpx(binPath);

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: workspacePath,
    encoding: "utf8",
    env: createHookEnvironment(binPath, fakeRun),
    input: fakeRun.stdinText ?? "{}\n",
  });

  return {
    exitCode: result.status,
    stdoutText: result.stdout,
    output: hookOutputSchema.parse(JSON.parse(result.stdout)),
  };
}

async function createWorkspace(): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), "voicelint-codex-script-"));
  workspacePaths.push(workspacePath);
  return workspacePath;
}

async function writeFakeNpx(binPath: string): Promise<void> {
  const fakeNpxPath = join(binPath, "npx");
  await writeFile(
    fakeNpxPath,
    [
      "#!/bin/sh",
      "printf \"%s\" \"$VOICELINT_FAKE_STDOUT\"",
      "printf \"%s\" \"$VOICELINT_FAKE_STDERR\" >&2",
      "exit \"$VOICELINT_FAKE_EXIT\"",
      "",
    ].join("\n"),
    "utf8",
  );
  await chmod(fakeNpxPath, 0o755);
}

function createHookEnvironment(
  binPath: string,
  fakeRun: FakeVoiceLintRun,
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${binPath}:${readProcessPath()}`,
    VOICELINT_FAKE_EXIT: fakeRun.exitCode.toString(),
    VOICELINT_FAKE_STDERR: fakeRun.stderrText ?? "",
    VOICELINT_FAKE_STDOUT: fakeRun.stdoutText ?? "",
  };
}

function readProcessPath(): string {
  return process.env.PATH ?? "";
}

async function removeWorkspace(workspacePath: string): Promise<void> {
  await rm(workspacePath, { recursive: true, force: true });
}
