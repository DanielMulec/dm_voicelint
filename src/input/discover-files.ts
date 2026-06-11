import { stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

import fg from "fast-glob";

import { createUsageError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import {
  createFastGlobIgnorePatterns,
  filterCandidatePaths,
  normalizeRelativePath,
  type PathFilterOptions,
} from "./path-filter.js";
import type { FileSystemSourceHandle } from "./read-source.js";

export interface DiscoverFilesOptions extends PathFilterOptions {
  readonly pathArgs: readonly string[];
}

export async function discoverPathFiles(
  options: DiscoverFilesOptions,
): Promise<Result<readonly FileSystemSourceHandle[], ReturnType<typeof createUsageError>>> {
  const candidatePathsResult = await collectPathCandidates(options);
  if (!candidatePathsResult.ok) {
    return candidatePathsResult;
  }

  const filteredPaths = await filterCandidatePaths(candidatePathsResult.value, options);
  return ok(filteredPaths.map((path) => createFileSystemHandle(options.cwd, path)));
}

async function collectPathCandidates(
  options: DiscoverFilesOptions,
): Promise<Result<readonly string[], ReturnType<typeof createUsageError>>> {
  const candidatePaths: string[] = [];

  for (const pathArg of options.pathArgs) {
    const pathEntriesResult = await collectSinglePathEntries(options, pathArg);
    if (!pathEntriesResult.ok) {
      return pathEntriesResult;
    }

    candidatePaths.push(...pathEntriesResult.value);
  }

  return ok(candidatePaths);
}

async function collectSinglePathEntries(
  options: DiscoverFilesOptions,
  pathArg: string,
): Promise<Result<readonly string[], ReturnType<typeof createUsageError>>> {
  const absolutePath = resolve(options.cwd, pathArg);
  const pathStatResult = await readPathStat(absolutePath, pathArg);
  if (!pathStatResult.ok) {
    return pathStatResult;
  }

  return pathStatResult.value.isDirectory()
    ? collectDirectoryEntries(options, absolutePath)
    : ok([toRelativePath(options.cwd, absolutePath)]);
}

async function collectDirectoryEntries(
  options: DiscoverFilesOptions,
  absoluteDirectoryPath: string,
): Promise<Result<readonly string[], ReturnType<typeof createUsageError>>> {
  const directoryPattern = toDirectoryPattern(options.cwd, absoluteDirectoryPath);
  const directoryEntries = await fg([directoryPattern], {
    cwd: options.cwd,
    dot: true,
    onlyFiles: true,
    ignore: [...createFastGlobIgnorePatterns(options.excludeGlobs)],
  });

  return ok(directoryEntries.map(normalizeRelativePath));
}

async function readPathStat(
  absolutePath: string,
  originalPath: string,
): Promise<Result<Awaited<ReturnType<typeof stat>>, ReturnType<typeof createUsageError>>> {
  try {
    return ok(await stat(absolutePath));
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown path stat failure.";
    return err(createUsageError(`Path does not exist: ${originalPath}. ${details}`));
  }
}

function createFileSystemHandle(cwd: string, path: string): FileSystemSourceHandle {
  return {
    kind: "filesystem",
    path,
    absolutePath: resolve(cwd, path),
  };
}

function toDirectoryPattern(cwd: string, absoluteDirectoryPath: string): string {
  const relativeDirectoryPath = toRelativePath(cwd, absoluteDirectoryPath);
  return relativeDirectoryPath.length === 0 ? "**/*" : `${relativeDirectoryPath}/**/*`;
}

function toRelativePath(cwd: string, absolutePath: string): string {
  return normalizeRelativePath(relative(cwd, absolutePath));
}
