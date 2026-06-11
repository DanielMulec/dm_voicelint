import { afterEach, describe, expect, it } from "vitest";

import { discoverPathFiles } from "../../src/input/discover-files.js";
import { createTemporaryWorkspace, removeWorkspace, writeWorkspaceFile } from "./test-helpers.js";

const workspacePaths: string[] = [];

describe("discoverPathFiles", () => {
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("discovers supported text files and excludes default ignored directories", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "README.md", "# Readme\n");
    await writeWorkspaceFile(workspacePath, "docs/guide.mdx", "# Guide\n");
    await writeWorkspaceFile(workspacePath, "notes/todo.txt", "todo\n");
    await writeWorkspaceFile(workspacePath, "node_modules/pkg/readme.md", "# Skip\n");
    await writeWorkspaceFile(workspacePath, "dist/output.md", "# Skip\n");
    await writeWorkspaceFile(workspacePath, "coverage/report.txt", "skip\n");

    const discoveryResult = await discoverPathFiles({
      cwd: workspacePath,
      pathArgs: ["."],
    });

    expect(discoveryResult).toMatchObject({
      ok: true,
      value: [
        { path: "README.md" },
        { path: "docs/guide.mdx" },
        { path: "notes/todo.txt" },
      ],
    });
  });

  it("respects include and exclude globs", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "README.md", "# Readme\n");
    await writeWorkspaceFile(workspacePath, "docs/public.md", "public\n");
    await writeWorkspaceFile(workspacePath, "docs/private.md", "private\n");

    const discoveryResult = await discoverPathFiles({
      cwd: workspacePath,
      pathArgs: ["."],
      includeGlobs: ["docs/**/*.md"],
      excludeGlobs: ["docs/private.md"],
    });

    expect(discoveryResult).toMatchObject({
      ok: true,
      value: [{ path: "docs/public.md" }],
    });
  });

  it("handles a missing path", async () => {
    const workspacePath = await createWorkspace();

    const discoveryResult = await discoverPathFiles({
      cwd: workspacePath,
      pathArgs: ["missing.md"],
    });

    expect(discoveryResult.ok).toBe(false);
    expect(discoveryResult.ok ? "" : discoveryResult.error.message).toContain(
      "Path does not exist: missing.md",
    );
  });

  it("skips unsupported or binary file paths without failing", async () => {
    const workspacePath = await createWorkspace();
    await writeWorkspaceFile(workspacePath, "image.png", new Uint8Array([137, 80, 78, 71]));

    const discoveryResult = await discoverPathFiles({
      cwd: workspacePath,
      pathArgs: ["image.png"],
    });

    expect(discoveryResult).toMatchObject({
      ok: true,
      value: [],
    });
  });
});

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-discover-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}
