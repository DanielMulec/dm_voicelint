import { argv, stderr, stdin, stdout } from "node:process";

import { createHelpText, createPlaceholderText, createUsageText } from "./help.js";
import { parseCliArguments } from "./parseArguments.js";
import { readPackageVersion } from "./packageVersion.js";

export async function runCli(
  args: readonly string[],
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  errorOutput: NodeJS.WritableStream,
): Promise<number> {
  const parsedArguments = parseCliArguments(args);

  if (parsedArguments.mode === "help") {
    output.write(createHelpText());
    return 0;
  }

  if (parsedArguments.mode === "version") {
    output.write(`${await readPackageVersion()}\n`);
    return 0;
  }

  return runScaffoldCommand(parsedArguments.tokens, input, errorOutput);
}

export async function runDefaultCli(): Promise<number> {
  return runCli(argv.slice(2), stdin, stdout, stderr);
}

const runScaffoldCommand = (
  tokens: readonly string[],
  input: NodeJS.ReadableStream,
  errorOutput: NodeJS.WritableStream,
): number => {
  if (tokens.length === 0 && isInteractiveInput(input)) {
    errorOutput.write(createUsageText());
    return 2;
  }

  errorOutput.write(createPlaceholderText(tokens));
  return 2;
};

const isInteractiveInput = (input: NodeJS.ReadableStream): boolean =>
  !("isTTY" in input) || input.isTTY === true;
