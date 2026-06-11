import { createInternalError, createUsageError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import {
  consumeDiffTokens,
  consumeInitTokens,
  consumeStandardTokens,
  defaultDiffLintState,
  defaultInitState,
  defaultStandardLintState,
  type DiffLintState,
  type StandardLintState,
} from "./args-parser.js";

export type OutputFormat = "pretty" | "json" | "agent";

export interface HelpCommand {
  readonly commandName: "help";
}

export interface VersionCommand {
  readonly commandName: "version";
}

export interface InitCommand {
  readonly commandName: "init";
  readonly agent: "codex" | null;
}

export interface PathsLintCommand {
  readonly commandName: "lint";
  readonly requestedInputMode: "paths";
  readonly pathArgs: readonly string[];
  readonly format: OutputFormat;
  readonly configPath?: string;
}

export interface StdinLintCommand {
  readonly commandName: "lint";
  readonly requestedInputMode: "stdin";
  readonly format: OutputFormat;
  readonly configPath?: string;
  readonly stdinFilePath?: string;
}

export interface AutoLintCommand {
  readonly commandName: "lint";
  readonly requestedInputMode: "auto";
  readonly format: OutputFormat;
  readonly configPath?: string;
  readonly stdinFilePath?: string;
}

export interface DiffLintCommand {
  readonly commandName: "lint";
  readonly requestedInputMode: "changed" | "staged";
  readonly format: OutputFormat;
  readonly configPath?: string;
}

export type ParsedLintCommand =
  | PathsLintCommand
  | StdinLintCommand
  | AutoLintCommand
  | DiffLintCommand;

export type ParsedCliCommand =
  | HelpCommand
  | VersionCommand
  | InitCommand
  | ParsedLintCommand;

type CliParseResult = Result<ParsedCliCommand, ReturnType<typeof createUsageError>>;

const helpFlags = new Set(["--help", "-h"]);
const versionFlags = new Set(["--version", "-v"]);

const topLevelParsers = new Map<
  string,
  (args: readonly string[]) => CliParseResult
>([
  ["init", parseInitCommand],
  ["changed", createDiffCommandParser("changed")],
  ["staged", createDiffCommandParser("staged")],
]);

export function parseCliArguments(args: readonly string[]): CliParseResult {
  const immediateCommand = parseImmediateCommand(args);
  return immediateCommand === null ? parseDeferredCommand(args) : ok(immediateCommand);
}

function parseImmediateCommand(args: readonly string[]): HelpCommand | VersionCommand | null {
  if (args.length !== 1) {
    return null;
  }

  return parseImmediateFlag(args[0]);
}

function parseImmediateFlag(value: string | undefined): HelpCommand | VersionCommand | null {
  if (isHelpFlag(value)) {
    return { commandName: "help" };
  }

  return isVersionFlag(value) ? { commandName: "version" } : null;
}

function parseDeferredCommand(args: readonly string[]): CliParseResult {
  if (args.length === 0) {
    return finalizeStandardLintState(defaultStandardLintState);
  }

  return parseDeferredCommandTokens(args[0], args);
}

function parseDeferredCommandTokens(firstToken: string | undefined, args: readonly string[]): CliParseResult {
  if (typeof firstToken !== "string") {
    return err(createInternalError("Missing top-level CLI token."));
  }

  const topLevelParser = topLevelParsers.get(firstToken);
  return topLevelParser === undefined
    ? parseStandardLintCommand(args)
    : topLevelParser(args.slice(1));
}

function parseStandardLintCommand(tokens: readonly string[]): CliParseResult {
  const parsedState = consumeStandardTokens(tokens, 0, defaultStandardLintState);
  return parsedState.ok
    ? finalizeStandardLintState(parsedState.value.nextState)
    : parsedState;
}

function parseInitCommand(tokens: readonly string[]): CliParseResult {
  const parsedState = consumeInitTokens(tokens, 0, defaultInitState);
  return parsedState.ok
    ? ok({
        commandName: "init",
        agent: parsedState.value.nextState.agent,
      })
    : parsedState;
}

function createDiffCommandParser(
  requestedInputMode: DiffLintCommand["requestedInputMode"],
): (args: readonly string[]) => CliParseResult {
  return (tokens: readonly string[]): CliParseResult => {
    const parsedState = consumeDiffTokens(tokens, 0, defaultDiffLintState);
    return parsedState.ok
      ? ok(createDiffLintCommand(requestedInputMode, parsedState.value.nextState))
      : parsedState;
  };
}

function createDiffLintCommand(
  requestedInputMode: DiffLintCommand["requestedInputMode"],
  state: DiffLintState,
): DiffLintCommand {
  return {
    commandName: "lint",
    requestedInputMode,
    format: state.format,
    ...createConfigPathProperty(state.configPath),
  };
}

function finalizeStandardLintState(state: StandardLintState): CliParseResult {
  const validationError = validateStandardLintState(state);
  return validationError === null ? ok(createStandardLintCommand(state)) : err(validationError);
}

function validateStandardLintState(
  state: StandardLintState,
): ReturnType<typeof createUsageError> | null {
  const validationMessage = readStandardLintValidationMessage(state);
  return typeof validationMessage === "string"
    ? createUsageError(validationMessage)
    : null;
}

function readStandardLintValidationMessage(state: StandardLintState): string | null {
  if (hasExplicitStdinConflict(state)) {
    return "Path arguments cannot be combined with --stdin.";
  }

  return hasStdinFilePathConflict(state)
    ? "--stdin-file-path is only valid in stdin mode."
    : null;
}

function hasExplicitStdinConflict(state: StandardLintState): boolean {
  return state.explicitStdin && state.pathArgs.length > 0;
}

function hasStdinFilePathConflict(state: StandardLintState): boolean {
  return state.stdinFilePath !== undefined && state.pathArgs.length > 0;
}

function createStandardLintCommand(state: StandardLintState): ParsedLintCommand {
  if (state.explicitStdin) {
    return createExplicitStdinLintCommand(state);
  }

  return state.pathArgs.length > 0
    ? createPathsLintCommand(state)
    : createAutoLintCommand(state);
}

function createPathsLintCommand(state: StandardLintState): PathsLintCommand {
  return {
    commandName: "lint",
    requestedInputMode: "paths",
    pathArgs: state.pathArgs,
    format: state.format,
    ...createConfigPathProperty(state.configPath),
  };
}

function createExplicitStdinLintCommand(state: StandardLintState): StdinLintCommand {
  return {
    commandName: "lint",
    requestedInputMode: "stdin",
    format: state.format,
    ...createConfigPathProperty(state.configPath),
    ...createStdinFilePathProperty(state.stdinFilePath),
  };
}

function createAutoLintCommand(state: StandardLintState): AutoLintCommand {
  return {
    commandName: "lint",
    requestedInputMode: "auto",
    format: state.format,
    ...createConfigPathProperty(state.configPath),
    ...createStdinFilePathProperty(state.stdinFilePath),
  };
}

function createConfigPathProperty(configPath: string | undefined): { readonly configPath?: string } {
  return typeof configPath === "string" ? { configPath } : {};
}

function createStdinFilePathProperty(
  stdinFilePath: string | undefined,
): { readonly stdinFilePath?: string } {
  return typeof stdinFilePath === "string" ? { stdinFilePath } : {};
}

function isHelpFlag(value: string | undefined): boolean {
  return typeof value === "string" && helpFlags.has(value);
}

function isVersionFlag(value: string | undefined): boolean {
  return typeof value === "string" && versionFlags.has(value);
}
