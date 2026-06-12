import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectoryPath = dirname(fileURLToPath(import.meta.url));
const repositoryRootPath = resolve(testDirectoryPath, "../..");
const packagedBinPath = resolve(repositoryRootPath, "bin/voicelint.mjs");
const fixtureProjectsPath = resolve(testDirectoryPath, "../fixtures/projects");

let builtCliReady = false;

export interface CliRunResult {
  readonly exitCode: number;
  readonly stdoutText: string;
  readonly stderrText: string;
}

export function ensureBuiltCli(): void {
  if (builtCliReady) {
    return;
  }

  execFileSync("npm", ["run", "build"], {
    cwd: repositoryRootPath,
    encoding: "utf8",
    stdio: "pipe",
  });
  builtCliReady = true;
}

export async function createFixtureWorkspace(
  fixtureName: string,
): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), `voicelint-e2e-${fixtureName}-`));
  await cp(resolve(fixtureProjectsPath, fixtureName), workspacePath, { recursive: true });
  return workspacePath;
}

export async function removeWorkspace(workspacePath: string): Promise<void> {
  await rm(workspacePath, { recursive: true, force: true });
}

export function runPackagedCli(
  args: readonly string[],
  options: { readonly cwd: string; readonly inputText?: string },
): CliRunResult {
  const commandResult = spawnSync(process.execPath, [packagedBinPath, ...args], {
    cwd: options.cwd,
    input: options.inputText ?? "",
    encoding: "utf8",
  });

  return {
    exitCode: commandResult.status ?? 2,
    stdoutText: commandResult.stdout,
    stderrText: commandResult.stderr,
  };
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

export function readRepositoryRootPath(): string {
  return repositoryRootPath;
}
