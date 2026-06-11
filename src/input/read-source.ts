import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { createInternalError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";

export interface FileSystemSourceHandle {
  readonly kind: "filesystem";
  readonly path: string;
  readonly absolutePath: string;
}

export interface GitIndexSourceHandle {
  readonly kind: "git-index";
  readonly path: string;
  readonly repoRoot: string;
}

export interface StandardInputSourceHandle {
  readonly kind: "stdin";
  readonly path: string;
  readonly content: string;
}

export type SourceHandle =
  | FileSystemSourceHandle
  | GitIndexSourceHandle
  | StandardInputSourceHandle;

export interface TextSource {
  readonly path: string;
  readonly content: string;
  readonly origin: SourceHandle["kind"];
}

export async function readSourceHandles(
  sourceHandles: readonly SourceHandle[],
): Promise<Result<readonly TextSource[], ReturnType<typeof createInternalError>>> {
  const sources: TextSource[] = [];

  for (const sourceHandle of sourceHandles) {
    const sourceResult = await readSourceHandle(sourceHandle);
    if (!sourceResult.ok) {
      return sourceResult;
    }

    sources.push(sourceResult.value);
  }

  return ok(sources);
}

async function readSourceHandle(
  sourceHandle: SourceHandle,
): Promise<Result<TextSource, ReturnType<typeof createInternalError>>> {
  if (sourceHandle.kind === "stdin") {
    return ok(createTextSource(sourceHandle.path, sourceHandle.content, sourceHandle.kind));
  }

  return sourceHandle.kind === "filesystem"
    ? readFileSystemSource(sourceHandle)
    : readGitIndexSource(sourceHandle);
}

async function readFileSystemSource(
  sourceHandle: FileSystemSourceHandle,
): Promise<Result<TextSource, ReturnType<typeof createInternalError>>> {
  try {
    const content = await readFile(sourceHandle.absolutePath, "utf8");
    return ok(createTextSource(sourceHandle.path, content, sourceHandle.kind));
  } catch (error) {
    return err(createInternalError(readSourceFailureMessage(sourceHandle.path, error)));
  }
}

function readGitIndexSource(
  sourceHandle: GitIndexSourceHandle,
): Promise<Result<TextSource, ReturnType<typeof createInternalError>>> {
  try {
    const content = execFileSync("git", ["show", `:${sourceHandle.path}`], {
      cwd: sourceHandle.repoRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });

    return Promise.resolve(ok(createTextSource(sourceHandle.path, content, sourceHandle.kind)));
  } catch (error) {
    return Promise.resolve(
      err(createInternalError(readSourceFailureMessage(sourceHandle.path, error))),
    );
  }
}

function createTextSource(
  path: string,
  content: string,
  origin: SourceHandle["kind"],
): TextSource {
  return { path, content, origin };
}

function readSourceFailureMessage(path: string, error: unknown): string {
  const details = error instanceof Error ? error.message : "Unknown source read failure.";
  return `Unable to read source content for ${path}: ${details}`;
}
