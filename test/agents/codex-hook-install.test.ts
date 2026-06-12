import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { installCodexHooks } from "../../src/agents/codex/codex-hook-install.js";
import {
  createTemporaryWorkspace,
  removeWorkspace,
  writeWorkspaceFile,
} from "../input/test-helpers.js";

const workspacePaths: string[] = [];
const deterministicTimestamp = "20260102030405";

describe("installCodexHooks", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("creates missing Codex hook config and wrapper scripts", async () => {
    const workspacePath = await createWorkspace();

    const result = await installCodexHooks({ cwd: workspacePath, timestampProvider: readTimestamp });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.value : {}).toMatchObject({
      status: "installed",
      actions: [
        { action: "created", path: ".codex/hooks.json" },
        { action: "created", path: ".codex/voicelint-post-tool-use-hook.mjs" },
        { action: "created", path: ".codex/voicelint-stop-hook.mjs" },
      ],
    });
    await expect(pathExists(join(workspacePath, ".codex/hooks.json"))).resolves.toBe(true);
    await expect(readHookScript(workspacePath, "voicelint-post-tool-use-hook.mjs")).resolves.toContain(
      "npx\", [\"voicelint\", \"changed\", \"--format\", \"agent\"]",
    );
    await expect(readHookScript(workspacePath, "voicelint-stop-hook.mjs")).resolves.toContain(
      "npx\", [\"voicelint\", \"changed\", \"--format\", \"agent\"]",
    );
  });

  it("backs up and merges an existing hook file when changes are needed", async () => {
    const workspacePath = await createWorkspace();
    const originalHooks = JSON.stringify({ hooks: { Stop: [] } }, null, 2);
    await writeWorkspaceFile(workspacePath, ".codex/hooks.json", `${originalHooks}\n`);

    const result = await installCodexHooks({ cwd: workspacePath, timestampProvider: readTimestamp });
    const actions = readInstallActions(result);

    expect(actions).toContainEqual({
      action: "backed-up",
      path: `.codex/hooks.json.bak.${deterministicTimestamp}`,
    });
    expect(actions).toContainEqual({ action: "updated", path: ".codex/hooks.json" });
    await expect(
      readFile(join(workspacePath, `.codex/hooks.json.bak.${deterministicTimestamp}`), "utf8"),
    ).resolves.toBe(`${originalHooks}\n`);
    await expect(readFile(join(workspacePath, ".codex/hooks.json"), "utf8")).resolves.toContain(
      "voicelint-stop-hook.mjs",
    );
  });

  it("does not back up or rewrite identical hook config and scripts", async () => {
    const workspacePath = await createWorkspace();

    await installCodexHooks({ cwd: workspacePath, timestampProvider: readTimestamp });
    const secondResult = await installCodexHooks({ cwd: workspacePath, timestampProvider: readTimestamp });

    expect(secondResult.ok ? secondResult.value : {}).toMatchObject({
      status: "installed",
      actions: [
        { action: "skipped", path: ".codex/hooks.json" },
        { action: "skipped", path: ".codex/voicelint-post-tool-use-hook.mjs" },
        { action: "skipped", path: ".codex/voicelint-stop-hook.mjs" },
      ],
    });
    await expect(readdir(join(workspacePath, ".codex"))).resolves.not.toContain(
      `hooks.json.bak.${deterministicTimestamp}`,
    );
  });

  it("leaves malformed hook config untouched and does not write scripts", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, ".codex/hooks.json", "{ broken json\n");

    const result = await installCodexHooks({ cwd: workspacePath, timestampProvider: readTimestamp });

    expect(result.ok ? result.value : {}).toMatchObject({ status: "manual-resolution" });
    expect(readManualResolutionMessage(result)).toContain("manual resolution");
    await expect(readFile(join(workspacePath, ".codex/hooks.json"), "utf8")).resolves.toBe("{ broken json\n");
    await expect(pathExists(join(workspacePath, ".codex/voicelint-post-tool-use-hook.mjs"))).resolves.toBe(
      false,
    );
    await expect(pathExists(join(workspacePath, ".codex/voicelint-stop-hook.mjs"))).resolves.toBe(false);
  });
});

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-codex-install-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}

function readTimestamp(): string {
  return deterministicTimestamp;
}

function readHookScript(workspacePath: string, scriptName: string): Promise<string> {
  return readFile(join(workspacePath, ".codex", scriptName), "utf8");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function readManualResolutionMessage(
  result: Awaited<ReturnType<typeof installCodexHooks>>,
): string {
  expect(result.ok).toBe(true);
  return result.ok && result.value.status === "manual-resolution" ? result.value.message : "";
}

function readInstallActions(
  result: Awaited<ReturnType<typeof installCodexHooks>>,
): readonly { readonly action: string; readonly path: string }[] {
  expect(result.ok).toBe(true);
  return result.ok && result.value.status === "installed" ? result.value.actions : [];
}
