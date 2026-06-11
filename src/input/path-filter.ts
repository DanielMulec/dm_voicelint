import { extname } from "node:path";

import fg from "fast-glob";
import ignore from "ignore";

export interface PathFilterOptions {
  readonly cwd: string;
  readonly includeGlobs?: readonly string[];
  readonly excludeGlobs?: readonly string[];
}

const supportedTextExtensions = new Set([".md", ".mdx", ".txt"]);

export const defaultIgnoredGlobs = [
  ".git/**",
  "node_modules/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".next/**",
  ".nuxt/**",
] as const;

export async function filterCandidatePaths(
  candidatePaths: readonly string[],
  options: PathFilterOptions,
): Promise<readonly string[]> {
  const uniquePaths = [...new Set(candidatePaths.map(normalizeRelativePath))].sort();
  const supportedPaths = uniquePaths.filter(isSupportedTextPath);
  const excludedPaths = excludeIgnoredPaths(supportedPaths, options.excludeGlobs);
  return applyIncludeGlobs(excludedPaths, options);
}

export function createFastGlobIgnorePatterns(
  excludeGlobs: readonly string[] | undefined,
): readonly string[] {
  return excludeGlobs === undefined
    ? defaultIgnoredGlobs
    : [...defaultIgnoredGlobs, ...excludeGlobs];
}

export function isSupportedTextPath(filePath: string): boolean {
  return supportedTextExtensions.has(extname(filePath).toLowerCase());
}

export function normalizeRelativePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//u, "");
}

async function applyIncludeGlobs(
  candidatePaths: readonly string[],
  options: PathFilterOptions,
): Promise<readonly string[]> {
  if (options.includeGlobs === undefined || options.includeGlobs.length === 0) {
    return candidatePaths;
  }

  const includedPathSet = await collectIncludedPathSet(options);
  return candidatePaths.filter((candidatePath) => includedPathSet.has(candidatePath));
}

async function collectIncludedPathSet(
  options: PathFilterOptions,
): Promise<ReadonlySet<string>> {
  const includedPaths = await fg([...(options.includeGlobs ?? [])], {
    cwd: options.cwd,
    dot: true,
    onlyFiles: true,
    ignore: [...createFastGlobIgnorePatterns(options.excludeGlobs)],
  });

  return new Set(includedPaths.map(normalizeRelativePath));
}

function excludeIgnoredPaths(
  candidatePaths: readonly string[],
  excludeGlobs: readonly string[] | undefined,
): readonly string[] {
  const pathMatcher = ignore().add(createFastGlobIgnorePatterns(excludeGlobs));
  return candidatePaths.filter((candidatePath) => !pathMatcher.ignores(candidatePath));
}
