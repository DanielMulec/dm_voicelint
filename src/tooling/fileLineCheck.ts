import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import fg from "fast-glob";

export interface FileLineCheckOptions {
  readonly rootDirectoryPath: string;
  readonly directoryNames: readonly string[];
  readonly maxLineCount: number;
}

export interface FileLineCheckFailure {
  readonly filePath: string;
  readonly lineCount: number;
}

export interface FileLineCheckResult {
  readonly checkedFileCount: number;
  readonly failures: readonly FileLineCheckFailure[];
}

const generatedMarkers = ["@generated", "generated file"];

export async function checkRepositoryFileLines(
  options: FileLineCheckOptions,
): Promise<FileLineCheckResult> {
  const filePaths = await collectTargetFilePaths(
    options.rootDirectoryPath,
    options.directoryNames,
  );
  const failures = await collectLineCountFailures(
    options.rootDirectoryPath,
    filePaths,
    options.maxLineCount,
  );

  return {
    checkedFileCount: filePaths.length,
    failures,
  };
}

export function formatLineCountResult(
  result: FileLineCheckResult,
  maxLineCount: number,
): string {
  if (result.failures.length === 0) {
    return `Checked ${result.checkedFileCount} files. All are within ${maxLineCount} lines.\n`;
  }

  const failureLines = result.failures.map(formatFailure);
  return [
    `Line count check failed. Code files must stay at or below ${maxLineCount} lines.`,
    ...failureLines,
    "",
  ].join("\n");
}

const collectTargetFilePaths = async (
  rootDirectoryPath: string,
  directoryNames: readonly string[],
): Promise<string[]> => {
  const patterns = directoryNames.map(toDirectoryPattern);
  const filePaths = await fg(patterns, {
    cwd: rootDirectoryPath,
    dot: true,
    onlyFiles: true,
  });

  return filePaths.map(normalizeFilePath).sort((leftFilePath, rightFilePath) =>
    leftFilePath.localeCompare(rightFilePath),
  );
};

const toDirectoryPattern = (directoryName: string): string =>
  `${directoryName.replaceAll("\\", "/")}/**/*`;

const normalizeFilePath = (filePath: string): string => filePath.split(sep).join("/");

const collectLineCountFailures = async (
  rootDirectoryPath: string,
  filePaths: readonly string[],
  maxLineCount: number,
): Promise<FileLineCheckFailure[]> => {
  const failures = await Promise.all(
    filePaths.map((filePath) =>
      findLineCountFailure(rootDirectoryPath, filePath, maxLineCount),
    ),
  );

  return failures.filter(isFailure);
};

const findLineCountFailure = async (
  rootDirectoryPath: string,
  filePath: string,
  maxLineCount: number,
): Promise<FileLineCheckFailure | null> => {
  const absoluteFilePath = resolve(rootDirectoryPath, filePath);
  const fileContent = await readFile(absoluteFilePath, "utf8");

  if (isGeneratedFile(fileContent)) {
    return null;
  }

  const lineCount = countLines(fileContent);
  return lineCount > maxLineCount ? { filePath, lineCount } : null;
};

const isGeneratedFile = (fileContent: string): boolean => {
  const headerText = fileContent.split(/\r?\n/u, 5).join("\n").toLowerCase();
  return generatedMarkers.some((marker) => headerText.includes(marker));
};

const countLines = (fileContent: string): number => {
  if (fileContent.length === 0) {
    return 0;
  }

  const normalizedContent = fileContent.replaceAll("\r\n", "\n");
  const contentWithoutTrailingNewline = normalizedContent.endsWith("\n")
    ? normalizedContent.slice(0, -1)
    : normalizedContent;

  return contentWithoutTrailingNewline.split("\n").length;
};

const isFailure = (
  failure: FileLineCheckFailure | null,
): failure is FileLineCheckFailure => failure !== null;

const formatFailure = (failure: FileLineCheckFailure): string =>
  `- ${failure.filePath}: ${failure.lineCount} lines`;
