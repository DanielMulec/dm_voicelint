import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { createUsageError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import {
  filterCandidatePaths,
  normalizeRelativePath,
  type PathFilterOptions,
} from "./path-filter.js";
import type { FileSystemSourceHandle, GitIndexSourceHandle } from "./read-source.js";

export type DiscoverGitFilesOptions = PathFilterOptions;

export async function discoverChangedFiles(
  options: DiscoverGitFilesOptions,
): Promise<
  Result<
    readonly FileSystemSourceHandle[],
    ReturnType<typeof createUsageError>
  >
> {
  const repoRootResult = findRepoRoot(options.cwd);
  if (!repoRootResult.ok) {
    return repoRootResult;
  }

  const candidatePaths = collectChangedCandidatePaths(repoRootResult.value);
  const filteredPaths = await filterCandidatePaths(candidatePaths, {
    ...options,
    cwd: repoRootResult.value,
  });

  return ok(filteredPaths.map((path) => createFileSystemHandle(repoRootResult.value, path)));
}

export async function discoverStagedFiles(
  options: DiscoverGitFilesOptions,
): Promise<
  Result<
    readonly GitIndexSourceHandle[],
    ReturnType<typeof createUsageError>
  >
> {
  const repoRootResult = findRepoRoot(options.cwd);
  if (!repoRootResult.ok) {
    return repoRootResult;
  }

  const candidatePaths = collectStagedCandidatePaths(repoRootResult.value);
  const filteredPaths = await filterCandidatePaths(candidatePaths, {
    ...options,
    cwd: repoRootResult.value,
  });

  return ok(filteredPaths.map((path) => createGitIndexHandle(repoRootResult.value, path)));
}

function findRepoRoot(
  cwd: string,
): Result<string, ReturnType<typeof createUsageError>> {
  try {
    return ok(runGitCommand(cwd, ["rev-parse", "--show-toplevel"]).trim());
  } catch (error) {
    return err(createUsageError(readGitFailureMessage("VoiceLint requires a Git repository.", error)));
  }
}

function collectChangedCandidatePaths(repoRoot: string): readonly string[] {
  // Changed mode includes untracked files because developers often lint before
  // staging newly created docs. Repositories without HEAD need ls-files instead
  // of diff so the first commit can still be linted.
  const trackedChangedPaths = hasHeadCommit(repoRoot)
    ? runGitLines(repoRoot, ["diff", "--name-only", "--diff-filter=ACMR", "HEAD", "--"])
    : runGitLines(repoRoot, ["ls-files", "--cached", "--others", "--exclude-standard"]);
  const untrackedPaths = runGitLines(repoRoot, ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set([...trackedChangedPaths, ...untrackedPaths].map(normalizeRelativePath))].sort();
}

function collectStagedCandidatePaths(repoRoot: string): readonly string[] {
  // --root makes staged additions visible before the repository has its first
  // commit, matching how Git hooks run in freshly initialized projects.
  return runGitLines(repoRoot, ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "--root", "--"])
    .map(normalizeRelativePath)
    .sort();
}

function hasHeadCommit(repoRoot: string): boolean {
  try {
    runGitCommand(repoRoot, ["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}

function createFileSystemHandle(repoRoot: string, path: string): FileSystemSourceHandle {
  return {
    kind: "filesystem",
    path,
    absolutePath: resolve(repoRoot, path),
  };
}

function createGitIndexHandle(repoRoot: string, path: string): GitIndexSourceHandle {
  return {
    kind: "git-index",
    path,
    repoRoot,
  };
}

function runGitLines(repoRoot: string, args: readonly string[]): readonly string[] {
  const output = runGitCommand(repoRoot, args);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function runGitCommand(repoRoot: string, args: readonly string[]): string {
  return execFileSync("git", [...args], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
}

function readGitFailureMessage(prefix: string, error: unknown): string {
  const details = error instanceof Error ? error.message : "Unknown Git command failure.";
  return `${prefix} ${details}`;
}
