import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export async function createTemporaryWorkspace(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function createGitWorkspace(prefix: string): Promise<string> {
  const workspacePath = await createTemporaryWorkspace(prefix);
  runGitCommand(workspacePath, ["init"]);
  runGitCommand(workspacePath, ["config", "user.name", "VoiceLint Test"]);
  runGitCommand(workspacePath, ["config", "user.email", "voicelint@example.com"]);
  return workspacePath;
}

export async function writeWorkspaceFile(
  workspacePath: string,
  relativePath: string,
  content: string | Uint8Array,
): Promise<void> {
  const absolutePath = join(workspacePath, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content);
}

export function runGitCommand(
  workspacePath: string,
  args: readonly string[],
): string {
  return execFileSync("git", [...args], {
    cwd: workspacePath,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
}

export async function removeWorkspace(workspacePath: string): Promise<void> {
  await rm(workspacePath, { recursive: true, force: true });
}
