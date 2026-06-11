import { argv, stderr, stdin, stdout } from "node:process";

import { executeInitCommand } from "../commands/init.js";
import { executeLintCommand } from "../commands/lint.js";
import type { HelpCommand, ParsedCliCommand, VersionCommand } from "./args.js";
import { parseCliArguments } from "./args.js";
import { createHelpText } from "./help.js";
import { readPackageVersion } from "./packageVersion.js";
import type { CommandResult } from "../shared/result.js";

export async function runCli(
  args: readonly string[],
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  errorOutput: NodeJS.WritableStream,
): Promise<number> {
  const parsedCommand = parseCliArguments(args);
  if (!parsedCommand.ok) {
    errorOutput.write(`${parsedCommand.error.message}\n`);
    return parsedCommand.error.exitCode;
  }

  return isImmediateCommand(parsedCommand.value)
    ? runImmediateCommand(parsedCommand.value, output)
    : runShellCommand(parsedCommand.value, input, output, errorOutput);
}

export async function runDefaultCli(): Promise<number> {
  return runCli(argv.slice(2), stdin, stdout, stderr);
}

const isImmediateCommand = (
  command: ParsedCliCommand,
): command is HelpCommand | VersionCommand =>
  command.commandName === "help" || command.commandName === "version";

const runImmediateCommand = async (
  command: HelpCommand | VersionCommand,
  output: NodeJS.WritableStream,
): Promise<number> => {
  const text = command.commandName === "help" ? createHelpText() : `${await readPackageVersion()}\n`;
  output.write(text);
  return 0;
};

const runShellCommand = (
  command: Exclude<ParsedCliCommand, HelpCommand | VersionCommand>,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  errorOutput: NodeJS.WritableStream,
): Promise<number> => {
  return writeShellCommandResult(command, input, output, errorOutput);
};

const writeShellCommandResult = async (
  command: Exclude<ParsedCliCommand, HelpCommand | VersionCommand>,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  errorOutput: NodeJS.WritableStream,
): Promise<number> => {
  const commandResult =
    command.commandName === "init"
      ? executeInitCommand(command)
      : await executeLintCommand(command, input);

  return writeCommandResult(commandResult, output, errorOutput);
};

const writeCommandResult = (
  commandResult: CommandResult,
  output: NodeJS.WritableStream,
  errorOutput: NodeJS.WritableStream,
): number => {
  if (!commandResult.ok) {
    errorOutput.write(`${commandResult.error.message}\n`);
    return commandResult.error.exitCode;
  }

  writeOptionalText(commandResult.value.stdoutText, output);
  writeOptionalText(commandResult.value.stderrText, errorOutput);
  return commandResult.value.exitCode;
};

const writeOptionalText = (
  text: string | undefined,
  stream: NodeJS.WritableStream,
): void => {
  if (typeof text === "string") {
    stream.write(text);
  }
};
