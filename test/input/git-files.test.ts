import { afterEach, describe, expect, it } from "vitest";

import { discoverChangedFiles, discoverStagedFiles } from "../../src/input/git-files.js";
import { readSourceHandles } from "../../src/input/read-source.js";
import {
  createGitWorkspace,
  removeWorkspace,
  runGitCommand,
  writeWorkspaceFile,
} from "./test-helpers.js";

const workspacePaths: string[] = [];

describe("git input discovery", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("discovers changed modified and untracked text files", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "README.md", "initial\n");
    runGitCommand(workspacePath, ["add", "README.md"]);
    runGitCommand(workspacePath, ["commit", "-m", "initial"]);

    await writeWorkspaceFile(workspacePath, "README.md", "working tree\n");
    await writeWorkspaceFile(workspacePath, "notes.txt", "untracked\n");
    await writeWorkspaceFile(workspacePath, "image.png", new Uint8Array([1, 2, 3]));

    const discoveryResult = await discoverChangedFiles({ cwd: workspacePath });
    expect(discoveryResult.ok).toBe(true);

    const sourcesResult = await readSourceHandles(discoveryResult.ok ? discoveryResult.value : []);
    expect(sourcesResult).toMatchObject({
      ok: true,
      value: [
        { path: "README.md", content: "working tree\n" },
        { path: "notes.txt", content: "untracked\n" },
      ],
    });
  });

  it("reads staged content from the index instead of unstaged working-tree content", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "README.md", "initial\n");
    runGitCommand(workspacePath, ["add", "README.md"]);
    runGitCommand(workspacePath, ["commit", "-m", "initial"]);

    await writeWorkspaceFile(workspacePath, "README.md", "staged content\n");
    runGitCommand(workspacePath, ["add", "README.md"]);
    await writeWorkspaceFile(workspacePath, "README.md", "unstaged content\n");

    const discoveryResult = await discoverStagedFiles({ cwd: workspacePath });
    expect(discoveryResult.ok).toBe(true);

    const sourcesResult = await readSourceHandles(discoveryResult.ok ? discoveryResult.value : []);
    expect(sourcesResult).toMatchObject({
      ok: true,
      value: [{ path: "README.md", content: "staged content\n" }],
    });
  });
});

async function createWorkspace(): Promise<string> {
  const workspacePath = await createGitWorkspace("voicelint-git-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}
