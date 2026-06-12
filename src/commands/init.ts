import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cwd as readCurrentWorkingDirectory } from "node:process";

import {
  installCodexHooks,
  type CodexHookInstallAction,
} from "../agents/codex/codex-hook-install.js";
import type { InitCommand } from "../cli/args.js";
import { exitCodes } from "../cli/exit-code.js";
import { createBaselineFiles, type BaselineFile } from "../init/baseline-files.js";
import { createInternalError } from "../shared/errors.js";
import { err, ok, type CommandResult, type Result } from "../shared/result.js";

export interface InitCommandOptions {
  readonly cwd?: string;
  readonly timestampProvider?: () => string;
}

interface MissingExistingFile {
  readonly state: "missing";
}

interface PresentExistingFile {
  readonly state: "present";
  readonly content: string;
}

type ExistingInitFile = MissingExistingFile | PresentExistingFile;

interface PlannedInitAction {
  readonly path: string;
  readonly absolutePath: string;
  readonly content: string;
  readonly action: "create" | "skip" | "conflict";
}

export async function executeInitCommand(
  command: InitCommand,
  options: InitCommandOptions = {},
): Promise<CommandResult> {
  return runInitCommand(
    command,
    options.cwd ?? readCurrentWorkingDirectory(),
    options.timestampProvider,
  );
}

async function runInitCommand(
  command: InitCommand,
  cwd: string,
  timestampProvider?: () => string,
): Promise<CommandResult> {
  const plannedActionsResult = await createPlannedInitActions(cwd);
  return plannedActionsResult.ok
    ? applyPlannedInitActions(command, cwd, plannedActionsResult.value, timestampProvider)
    : plannedActionsResult;
}

async function createPlannedInitActions(
  cwd: string,
): Promise<Result<readonly PlannedInitAction[], ReturnType<typeof createInternalError>>> {
  const plannedActions: PlannedInitAction[] = [];

  for (const baselineFile of createBaselineFiles()) {
    const plannedActionResult = await createPlannedInitAction(cwd, baselineFile);
    if (!plannedActionResult.ok) {
      return plannedActionResult;
    }

    plannedActions.push(plannedActionResult.value);
  }

  return ok(plannedActions);
}

async function createPlannedInitAction(
  cwd: string,
  baselineFile: BaselineFile,
): Promise<Result<PlannedInitAction, ReturnType<typeof createInternalError>>> {
  const absolutePath = resolve(cwd, baselineFile.path);
  const existingFileResult = await readExistingInitFile(absolutePath, baselineFile.path);
  if (!existingFileResult.ok) {
    return existingFileResult;
  }

  return ok({
    path: baselineFile.path,
    absolutePath,
    content: baselineFile.content,
    action: readPlannedAction(existingFileResult.value, baselineFile.content),
  });
}

function readPlannedAction(
  existingFile: ExistingInitFile,
  baselineContent: string,
): PlannedInitAction["action"] {
  if (existingFile.state === "missing") {
    return "create";
  }

  return existingFile.content === baselineContent ? "skip" : "conflict";
}

async function readExistingInitFile(
  absolutePath: string,
  relativePath: string,
): Promise<Result<ExistingInitFile, ReturnType<typeof createInternalError>>> {
  try {
    return ok({
      state: "present",
      content: await readFile(absolutePath, "utf8"),
    });
  } catch (error) {
    return isMissingFileError(error)
      ? ok({ state: "missing" })
      : err(createInternalError(readInitReadFailureMessage(relativePath, error)));
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return readErrorCode(error) === "ENOENT";
}

function readErrorCode(error: unknown): string | undefined {
  return isErrorWithCode(error) ? error.code : undefined;
}

function isErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
    && "code" in error
    && typeof error.code === "string";
}

function readInitReadFailureMessage(relativePath: string, error: unknown): string {
  const details = error instanceof Error ? error.message : "Unknown init file read failure.";
  return `Unable to read existing init file ${relativePath}: ${details}`;
}

async function applyPlannedInitActions(
  command: InitCommand,
  cwd: string,
  plannedActions: readonly PlannedInitAction[],
  timestampProvider?: () => string,
): Promise<CommandResult> {
  return hasConflictingInitFiles(plannedActions)
    ? createInitConflictResult(command, plannedActions)
    : finishSuccessfulInit(command, cwd, plannedActions, timestampProvider);
}

function hasConflictingInitFiles(plannedActions: readonly PlannedInitAction[]): boolean {
  return plannedActions.some((plannedAction) => plannedAction.action === "conflict");
}

async function writeCreatedInitFiles(
  plannedActions: readonly PlannedInitAction[],
): Promise<Result<void, ReturnType<typeof createInternalError>>> {
  for (const plannedAction of plannedActions.filter(isCreateInitAction)) {
    const writeResult = await writeCreatedInitFile(plannedAction);
    if (!writeResult.ok) {
      return writeResult;
    }
  }

  return ok(undefined);
}

async function writeCreatedInitFile(
  plannedAction: PlannedInitAction,
): Promise<Result<void, ReturnType<typeof createInternalError>>> {
  try {
    await mkdir(dirname(plannedAction.absolutePath), { recursive: true });
    await writeFile(plannedAction.absolutePath, plannedAction.content, "utf8");
    return ok(undefined);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown init file write failure.";
    return err(createInternalError(`Unable to write init file ${plannedAction.path}: ${details}`));
  }
}

function isCreateInitAction(plannedAction: PlannedInitAction): boolean {
  return plannedAction.action === "create";
}

function createInitConflictResult(
  command: InitCommand,
  plannedActions: readonly PlannedInitAction[],
): CommandResult {
  return ok({
    exitCode: exitCodes.failure,
    stderrText: createInitConflictText(command, plannedActions),
  });
}

async function finishSuccessfulCodexInit(
  cwd: string,
  plannedActions: readonly PlannedInitAction[],
  timestampProvider?: () => string,
): Promise<CommandResult> {
  const installResult = await installCodexHooks({
    cwd,
    ...createTimestampProviderOption(timestampProvider),
  });
  if (!installResult.ok) {
    return installResult;
  }

  return installResult.value.status === "installed"
    ? ok({
        exitCode: exitCodes.success,
        stdoutText: createCodexInitSuccessText(plannedActions, installResult.value.actions),
      })
    : ok({
        exitCode: exitCodes.failure,
        stdoutText: createInitSuccessText(plannedActions),
        stderrText: `${installResult.value.message}\n`,
      });
}

function createTimestampProviderOption(
  timestampProvider: (() => string) | undefined,
): { readonly timestampProvider?: () => string } {
  return timestampProvider === undefined ? {} : { timestampProvider };
}

async function finishSuccessfulInit(
  command: InitCommand,
  cwd: string,
  plannedActions: readonly PlannedInitAction[],
  timestampProvider?: () => string,
): Promise<CommandResult> {
  const writeResult = await writeCreatedInitFiles(plannedActions);
  if (!writeResult.ok) {
    return writeResult;
  }

  return command.agent === null
    ? ok({
        exitCode: exitCodes.success,
        stdoutText: createInitSuccessText(plannedActions),
      })
    : finishSuccessfulCodexInit(cwd, plannedActions, timestampProvider);
}

function createInitSuccessText(plannedActions: readonly PlannedInitAction[]): string {
  return [
    readInitSuccessSummary(plannedActions),
    ...createInitActionLines(plannedActions, "create", "Created"),
    ...createInitActionLines(plannedActions, "skip", "Skipped"),
    "",
  ].join("\n");
}

function createCodexInitSuccessText(
  plannedActions: readonly PlannedInitAction[],
  hookActions: readonly CodexHookInstallAction[],
): string {
  return [
    readInitSuccessSummary(plannedActions),
    ...createInitActionLines(plannedActions, "create", "Created"),
    ...createInitActionLines(plannedActions, "skip", "Skipped"),
    ...createHookActionLines(hookActions),
    ...createCodexTrustReminderLines(),
    "",
  ].join("\n");
}

function readInitSuccessSummary(plannedActions: readonly PlannedInitAction[]): string {
  return plannedActions.some((plannedAction) => plannedAction.action === "create")
    ? "VoiceLint init completed."
    : "VoiceLint init baseline is already present.";
}

function createInitConflictText(
  command: InitCommand,
  plannedActions: readonly PlannedInitAction[],
): string {
  return [
    "VoiceLint init requires manual resolution.",
    ...createInitActionLines(plannedActions, "skip", "Skipped"),
    ...createInitActionLines(plannedActions, "conflict", "Conflict"),
    ...createManualResolutionLines(command),
    "",
  ].join("\n");
}

function createInitActionLines(
  plannedActions: readonly PlannedInitAction[],
  action: PlannedInitAction["action"],
  label: string,
): readonly string[] {
  return plannedActions
    .filter((plannedAction) => plannedAction.action === action)
    .map((plannedAction) => `${label}: ${plannedAction.path}`);
}

function createManualResolutionLines(command: InitCommand): readonly string[] {
  const baseLines = [
    "Review the conflicting files above and merge the VoiceLint baseline manually.",
    "Re-run `voicelint init` after the conflicting files are resolved.",
  ];

  return command.agent === null ? baseLines : [...baseLines, ...createAgentSetupLines()];
}

function createAgentSetupLines(): readonly string[] {
  return [
    "After resolving the baseline files, re-run `voicelint init --agent codex` to install project-local Codex hooks.",
  ];
}

function createHookActionLines(hookActions: readonly CodexHookInstallAction[]): readonly string[] {
  return hookActions.map((hookAction) => `${readHookActionLabel(hookAction.action)}: ${hookAction.path}`);
}

function readHookActionLabel(action: CodexHookInstallAction["action"]): string {
  const labels = {
    "backed-up": "Backed up",
    created: "Created",
    skipped: "Skipped",
    updated: "Updated",
  } satisfies Record<CodexHookInstallAction["action"], string>;

  return labels[action];
}

function createCodexTrustReminderLines(): readonly string[] {
  return [
    "VoiceLint wrote project-local Codex hook config.",
    "Codex only loads project-local hooks for trusted projects.",
    "Open Codex, inspect the hook config, and trust this project if you want the hook to run.",
  ];
}
