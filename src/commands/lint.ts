import type {
  AutoLintCommand,
  DiffLintCommand,
  ParsedLintCommand,
  PathsLintCommand,
  StdinLintCommand,
} from "../cli/args.js";
import { exitCodes } from "../cli/exit-code.js";
import { createUsageError } from "../shared/errors.js";
import { err, ok, type CommandResult, type Result } from "../shared/result.js";

interface ResolvedLintShell {
  readonly inputMode: "paths" | "changed" | "staged" | "stdin";
  readonly format: ParsedLintCommand["format"];
  readonly pathArgs?: readonly string[];
  readonly configPath?: string;
  readonly stdinFilePath?: string;
}

export function executeLintCommand(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
): CommandResult {
  const resolvedShell = resolveLintShell(command, input);
  return resolvedShell.ok
    ? ok({
        exitCode: exitCodes.failure,
        stderrText: createLintShellText(resolvedShell.value),
      })
    : resolvedShell;
}

function resolveLintShell(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
): Result<ResolvedLintShell, ReturnType<typeof createUsageError>> {
  return command.requestedInputMode === "auto"
    ? resolveAutomaticStdinShell(command, input)
    : ok(createExplicitLintShell(command));
}

function resolveAutomaticStdinShell(
  command: AutoLintCommand,
  input: NodeJS.ReadableStream,
): Result<ResolvedLintShell, ReturnType<typeof createUsageError>> {
  return isInteractiveInput(input)
    ? err(
        createUsageError(
          "VoiceLint requires a command, path, or stdin input. Use `voicelint --stdin` or pipe text into the CLI.",
        ),
      )
    : ok(createStdinShell(command.format, command.configPath, command.stdinFilePath));
}

function createExplicitLintShell(
  command: Exclude<ParsedLintCommand, AutoLintCommand>,
): ResolvedLintShell {
  return command.requestedInputMode === "paths"
    ? createPathsShell(command)
    : createNonPathExplicitShell(command);
}

function createPathsShell(command: PathsLintCommand): ResolvedLintShell {
  return {
    inputMode: "paths",
    format: command.format,
    pathArgs: command.pathArgs,
    ...createConfigPathProperty(command.configPath),
  };
}

function createNonPathExplicitShell(
  command: DiffLintCommand | StdinLintCommand,
): ResolvedLintShell {
  return command.requestedInputMode === "stdin"
    ? createStdinShell(command.format, command.configPath, command.stdinFilePath)
    : createDiffShell(command);
}

function createDiffShell(command: DiffLintCommand): ResolvedLintShell {
  return {
    inputMode: command.requestedInputMode,
    format: command.format,
    ...createConfigPathProperty(command.configPath),
  };
}

function createStdinShell(
  format: ParsedLintCommand["format"],
  configPath: string | undefined,
  stdinFilePath: string | undefined,
): ResolvedLintShell {
  return {
    inputMode: "stdin",
    format,
    ...createConfigPathProperty(configPath),
    ...createStdinFilePathProperty(stdinFilePath ?? "<stdin>.md"),
  };
}

function createLintShellText(shell: ResolvedLintShell): string {
  return [
    "VoiceLint lint command shell recognized.",
    `Input mode: ${shell.inputMode}`,
    `Output format: ${shell.format}`,
    ...createShellDetailLines(shell),
    "Implementation pending.",
    "",
  ].join("\n");
}

function createShellDetailLines(shell: ResolvedLintShell): readonly string[] {
  if (shell.inputMode === "paths") {
    return createPathDetailLines(shell);
  }

  return shell.inputMode === "stdin"
    ? createStdinDetailLines(shell)
    : createConfigPathLines(shell.configPath);
}

function createPathDetailLines(shell: ResolvedLintShell): readonly string[] {
  const pathArgumentText = Array.isArray(shell.pathArgs) ? shell.pathArgs.join(", ") : "";
  return [`Path arguments: ${pathArgumentText}`, ...createConfigPathLines(shell.configPath)];
}

function createStdinDetailLines(shell: ResolvedLintShell): readonly string[] {
  return [
    `Stdin file path: ${shell.stdinFilePath ?? "<stdin>.md"}`,
    ...createConfigPathLines(shell.configPath),
  ];
}

function createConfigPathLines(configPath: string | undefined): readonly string[] {
  return typeof configPath === "string" ? [`Config path: ${configPath}`] : [];
}

function createConfigPathProperty(configPath: string | undefined): { readonly configPath?: string } {
  return typeof configPath === "string" ? { configPath } : {};
}

function createStdinFilePathProperty(
  stdinFilePath: string | undefined,
): { readonly stdinFilePath?: string } {
  return typeof stdinFilePath === "string" ? { stdinFilePath } : {};
}

function isInteractiveInput(input: NodeJS.ReadableStream): boolean {
  return !("isTTY" in input) || input.isTTY === true;
}
