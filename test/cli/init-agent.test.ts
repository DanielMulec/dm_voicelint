import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PassThrough, Writable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

import { runCli } from "../../src/cli/main.js";
import {
  createTemporaryWorkspace,
  removeWorkspace,
  writeWorkspaceFile,
} from "../input/test-helpers.js";

const workspacePaths: string[] = [];

describe("voicelint init --agent codex", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("creates baseline files and Codex hook files", async () => {
    const workspacePath = await createWorkspace();

    const result = await runCliInWorkspace(workspacePath, ["init", "--agent", "codex"]);

    expect(result.exitCode).toBe(0);
    expect(result.errorText).toBe("");
    expect(result.outputText).toContain("Created: voicelint.config.yml");
    expect(result.outputText).toContain("Created: .codex/hooks.json");
    expect(result.outputText).toContain("Created: .codex/voicelint-post-tool-use-hook.mjs");
    expect(result.outputText).toContain("Created: .codex/voicelint-stop-hook.mjs");
    expect(result.outputText).toContain("Codex only loads project-local hooks for trusted projects.");
    await expect(pathExists(join(workspacePath, "voicelint.config.yml"))).resolves.toBe(true);
    await expect(pathExists(join(workspacePath, ".codex/hooks.json"))).resolves.toBe(true);
    await expect(readFile(join(workspacePath, ".codex/hooks.json"), "utf8")).resolves.toContain(
      "voicelint-post-tool-use-hook.mjs",
    );
  });

  it("fails unsupported agent values", async () => {
    const result = await runCliWithStreams(["init", "--agent", "claude"]);

    expect(result.exitCode).toBe(2);
    expect(result.outputText).toBe("");
    expect(result.errorText).toContain("Unsupported agent: claude");
  });

  it("keeps baseline conflicts from writing Codex files", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "voicelint.config.yml", "custom\n");

    const result = await runCliInWorkspace(workspacePath, ["init", "--agent", "codex"]);

    expect(result.exitCode).toBe(2);
    expect(result.outputText).toBe("");
    expect(result.errorText).toContain("Conflict: voicelint.config.yml");
    expect(result.errorText).toContain("re-run `voicelint init --agent codex`");
    await expect(pathExists(join(workspacePath, ".codex/hooks.json"))).resolves.toBe(false);
  });

  it("lists skipped hook files on repeated init", async () => {
    const workspacePath = await createWorkspace();

    await runCliInWorkspace(workspacePath, ["init", "--agent", "codex"]);
    const result = await runCliInWorkspace(workspacePath, ["init", "--agent", "codex"]);

    expect(result.exitCode).toBe(0);
    expect(result.outputText).toContain("VoiceLint init baseline is already present.");
    expect(result.outputText).toContain("Skipped: .codex/hooks.json");
    expect(result.outputText).toContain("Skipped: .codex/voicelint-post-tool-use-hook.mjs");
    expect(result.outputText).toContain("Skipped: .codex/voicelint-stop-hook.mjs");
  });

  it("exits 2 for malformed existing Codex hook config without writing scripts", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, ".codex/hooks.json", "{ broken json\n");

    const result = await runCliInWorkspace(workspacePath, ["init", "--agent", "codex"]);

    expect(result.exitCode).toBe(2);
    expect(result.outputText).toContain("VoiceLint init completed.");
    expect(result.errorText).toContain("manual resolution");
    expect(result.errorText).toContain("did not write hook scripts");
    await expect(readFile(join(workspacePath, ".codex/hooks.json"), "utf8")).resolves.toBe("{ broken json\n");
    await expect(pathExists(join(workspacePath, ".codex/voicelint-stop-hook.mjs"))).resolves.toBe(false);
  });
});

class BufferStream extends Writable {
  public text = "";

  public override _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.text += chunk.toString();
    callback();
  }
}

interface CliRunResult {
  readonly exitCode: number;
  readonly outputText: string;
  readonly errorText: string;
}

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-init-agent-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}

async function runCliInWorkspace(
  workspacePath: string,
  args: readonly string[],
): Promise<CliRunResult> {
  const previousWorkingDirectory = process.cwd();
  process.chdir(workspacePath);

  try {
    return await runCliWithStreams(args);
  } finally {
    process.chdir(previousWorkingDirectory);
  }
}

async function runCliWithStreams(args: readonly string[]): Promise<CliRunResult> {
  const input = new PassThrough();
  input.end("");
  const output = new BufferStream();
  const errorOutput = new BufferStream();
  const exitCode = await runCli(args, input, output, errorOutput);

  return {
    exitCode,
    outputText: output.text,
    errorText: errorOutput.text,
  };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
