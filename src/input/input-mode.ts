import { cwd as readCurrentWorkingDirectory } from "node:process";

import type { ParsedLintCommand } from "../cli/args.js";
import { createUsageError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import { discoverPathFiles } from "./discover-files.js";
import { discoverChangedFiles, discoverStagedFiles } from "./git-files.js";
import { readSourceHandles, type TextSource } from "./read-source.js";
import { readStandardInputSource } from "./stdin.js";

export interface InputDiscoveryOptions {
  readonly cwd?: string;
  readonly includeGlobs?: readonly string[];
  readonly excludeGlobs?: readonly string[];
}

export interface DiscoveredInputSources {
  readonly inputMode: "paths" | "changed" | "staged" | "stdin";
  readonly sources: readonly TextSource[];
}

export async function discoverInputSources(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
  options: InputDiscoveryOptions = {},
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  const cwd = options.cwd ?? readCurrentWorkingDirectory();
  return routeInputDiscoveryCommand(command, input, options, cwd);
}

async function routeInputDiscoveryCommand(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
  options: InputDiscoveryOptions,
  cwd: string,
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  return isAutomaticInputCommand(command)
    ? discoverAutomaticStdinSources(command, input)
    : discoverExplicitInputSources(command, input, options, cwd);
}

async function discoverExplicitInputSources(
  command: Exclude<ParsedLintCommand, Extract<ParsedLintCommand, { requestedInputMode: "auto" }>>,
  input: NodeJS.ReadableStream,
  options: InputDiscoveryOptions,
  cwd: string,
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  if (command.requestedInputMode === "stdin") {
    return discoverExplicitStdinSources(command.stdinFilePath, input);
  }

  return command.requestedInputMode === "paths"
    ? discoverPathModeSources(command.pathArgs, options, cwd)
    : discoverGitModeSources(command.requestedInputMode, options, cwd);
}

async function discoverAutomaticStdinSources(
  command: Extract<ParsedLintCommand, { requestedInputMode: "auto" }>,
  input: NodeJS.ReadableStream,
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  return isInteractiveInput(input)
    ? err(
        createUsageError(
          "VoiceLint requires a command, path, or stdin input. Use `voicelint --stdin` or pipe text into the CLI.",
        ),
      )
    : discoverExplicitStdinSources(command.stdinFilePath, input);
}

async function discoverExplicitStdinSources(
  stdinFilePath: string | undefined,
  input: NodeJS.ReadableStream,
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  const stdinSourceResult = await readStandardInputSource(input, stdinFilePath);
  if (!stdinSourceResult.ok) {
    return stdinSourceResult;
  }

  const textSourcesResult = await readSourceHandles([stdinSourceResult.value]);
  return textSourcesResult.ok
    ? ok({
        inputMode: "stdin",
        sources: textSourcesResult.value,
      })
    : textSourcesResult;
}

async function discoverPathModeSources(
  pathArgs: readonly string[],
  options: InputDiscoveryOptions,
  cwd: string,
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  const fileHandlesResult = await discoverPathFiles(
    createPathDiscoveryOptions(cwd, pathArgs, options),
  );

  return fileHandlesResult.ok
    ? createDiscoveredInput("paths", fileHandlesResult.value)
    : fileHandlesResult;
}

async function discoverGitModeSources(
  requestedInputMode: Extract<ParsedLintCommand["requestedInputMode"], "changed" | "staged">,
  options: InputDiscoveryOptions,
  cwd: string,
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  const fileHandlesResult = requestedInputMode === "changed"
    ? await discoverChangedFiles(createFilterOptions(cwd, options))
    : await discoverStagedFiles(createFilterOptions(cwd, options));

  return fileHandlesResult.ok
    ? createDiscoveredInput(requestedInputMode, fileHandlesResult.value)
    : fileHandlesResult;
}

async function createDiscoveredInput(
  inputMode: "paths" | "changed" | "staged",
  sourceHandles: Parameters<typeof readSourceHandles>[0],
): Promise<Result<DiscoveredInputSources, ReturnType<typeof createUsageError>>> {
  const textSourcesResult = await readSourceHandles(sourceHandles);
  return textSourcesResult.ok
    ? ok({
        inputMode,
        sources: textSourcesResult.value,
      })
    : textSourcesResult;
}

function isInteractiveInput(input: NodeJS.ReadableStream): boolean {
  return !("isTTY" in input) || input.isTTY === true;
}

function isAutomaticInputCommand(
  command: ParsedLintCommand,
): command is Extract<ParsedLintCommand, { requestedInputMode: "auto" }> {
  return command.requestedInputMode === "auto";
}

function createPathDiscoveryOptions(
  cwd: string,
  pathArgs: readonly string[],
  options: InputDiscoveryOptions,
): Parameters<typeof discoverPathFiles>[0] {
  return {
    pathArgs,
    ...createFilterOptions(cwd, options),
  };
}

function createFilterOptions(
  cwd: string,
  options: InputDiscoveryOptions,
): { readonly cwd: string; readonly includeGlobs?: readonly string[]; readonly excludeGlobs?: readonly string[] } {
  return {
    cwd,
    ...createOptionalGlobs("includeGlobs", options.includeGlobs),
    ...createOptionalGlobs("excludeGlobs", options.excludeGlobs),
  };
}

function createOptionalGlobs(
  key: "includeGlobs" | "excludeGlobs",
  globs: readonly string[] | undefined,
): { readonly includeGlobs?: readonly string[]; readonly excludeGlobs?: readonly string[] } {
  return globs === undefined ? {} : { [key]: globs };
}
