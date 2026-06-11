#!/usr/bin/env node

import process from "node:process";

import {
  checkRepositoryFileLines,
  formatLineCountResult,
} from "../src/tooling/fileLineCheck.ts";

const trackedDirectoryNames = ["src", "test", "scripts"];
const maxLineCount = 400;

const resolveRootDirectoryPath = (args) => {
  if (args.length === 0) {
    return process.cwd();
  }

  if (isRootFlagPair(args)) {
    return args[1];
  }

  throw new Error("Usage: tsx ./scripts/check-file-lines.mjs [--root PATH]");
};

const isRootFlagPair = (args) => args.length === 2 && args[0] === "--root";

const run = async () => {
  const rootDirectoryPath = resolveRootDirectoryPath(process.argv.slice(2));
  const result = await checkRepositoryFileLines({
    rootDirectoryPath,
    directoryNames: trackedDirectoryNames,
    maxLineCount,
  });

  if (result.failures.length === 0) {
    process.stdout.write(formatLineCountResult(result, maxLineCount));
    return 0;
  }

  process.stderr.write(formatLineCountResult(result, maxLineCount));
  return 1;
};

try {
  process.exitCode = await run();
} catch (error) {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown line count failure.";
  process.stderr.write(`${errorMessage}\n`);
  process.exitCode = 1;
}
