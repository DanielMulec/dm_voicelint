#!/usr/bin/env node

import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const binDirectoryPath = dirname(fileURLToPath(import.meta.url));
const entryPointPath = resolve(binDirectoryPath, "../dist/cli/main.js");

const loadCompiledCli = async () => {
  await access(entryPointPath, constants.R_OK);
  return import(pathToFileURL(entryPointPath).href);
};

const writeBuildError = () => {
  process.stderr.write(
    "VoiceLint is not built yet. Run `npm run build` before invoking the packaged CLI.\n",
  );
};

try {
  const cliModule = await loadCompiledCli();
  process.exitCode = await cliModule.runCli(
    process.argv.slice(2),
    process.stdin,
    process.stdout,
    process.stderr,
  );
} catch (error) {
  writeBuildError();
  if (error instanceof Error && error.message.length > 0) {
    process.stderr.write(`${error.message}\n`);
  }
  process.exitCode = 2;
}
