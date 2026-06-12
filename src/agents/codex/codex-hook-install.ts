import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { createInternalError } from "../../shared/errors.js";
import { err, ok, type Result } from "../../shared/result.js";
import { codexHookFiles } from "./codex-hook-config.js";
import { mergeVoiceLintCodexHooks } from "./codex-hook-merge.js";
import { createPostToolUseHookScript, createStopHookScript } from "./codex-hook-scripts.js";

export type CodexHookFileAction = "created" | "skipped" | "updated" | "backed-up";

export interface CodexHookInstallAction {
  readonly action: CodexHookFileAction;
  readonly path: string;
}

export interface CodexHookInstallSuccess {
  readonly status: "installed";
  readonly actions: readonly CodexHookInstallAction[];
}

export interface CodexHookInstallManualResolution {
  readonly status: "manual-resolution";
  readonly message: string;
}

export type CodexHookInstallResult = CodexHookInstallSuccess | CodexHookInstallManualResolution;

export interface CodexHookInstallOptions {
  readonly cwd: string;
  readonly timestampProvider?: () => string;
}

interface ExistingTextFile {
  readonly state: "present";
  readonly content: string;
}

interface MissingTextFile {
  readonly state: "missing";
}

type ExistingFile = ExistingTextFile | MissingTextFile;

export async function installCodexHooks(
  options: CodexHookInstallOptions,
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  const actions: CodexHookInstallAction[] = [];
  const hookConfigResult = await installHookConfig(options, actions);
  return hookConfigResult.ok
    ? finishHookScriptInstall(options.cwd, hookConfigResult.value, actions)
    : hookConfigResult;
}

async function finishHookScriptInstall(
  cwd: string,
  hookConfigResult: CodexHookInstallResult,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  return hookConfigResult.status === "manual-resolution"
    ? ok(hookConfigResult)
    : writeHookScripts(cwd, actions);
}

async function writeHookScripts(
  cwd: string,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  const scriptResult = await installHookScripts(cwd, actions);
  return scriptResult.ok ? ok({ status: "installed", actions }) : scriptResult;
}

async function installHookConfig(
  options: CodexHookInstallOptions,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  const hooksPath = join(options.cwd, codexHookFiles.hooksConfig);
  const existingFileResult = await readExistingFile(hooksPath, codexHookFiles.hooksConfig);
  if (!existingFileResult.ok) {
    return existingFileResult;
  }

  return existingFileResult.value.state === "missing"
    ? writeMissingHookConfig(hooksPath, actions)
    : mergeExistingHookConfig(options, existingFileResult.value.content, actions);
}

async function writeMissingHookConfig(
  hooksPath: string,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  const mergeResult = mergeVoiceLintCodexHooks({});
  if (!mergeResult.ok) {
    return ok(createManualResolutionResult(mergeResult.message));
  }

  const writeResult = await writeTextFile(hooksPath, stringifyHookConfig(mergeResult.config));
  if (!writeResult.ok) {
    return writeResult;
  }

  actions.push({ action: "created", path: codexHookFiles.hooksConfig });
  return ok({ status: "installed", actions });
}

async function mergeExistingHookConfig(
  options: CodexHookInstallOptions,
  existingContent: string,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  const parsedConfigResult = parseExistingHookConfig(existingContent);
  return parsedConfigResult.ok
    ? mergeParsedHookConfig(options, existingContent, parsedConfigResult.config, actions)
    : ok(createManualResolutionResult(parsedConfigResult.message));
}

interface ParsedHookConfigSuccess {
  readonly ok: true;
  readonly config: unknown;
}

interface ParsedHookConfigFailure {
  readonly ok: false;
  readonly message: string;
}

function parseExistingHookConfig(content: string): ParsedHookConfigSuccess | ParsedHookConfigFailure {
  try {
    return { ok: true, config: JSON.parse(content) };
  } catch (error) {
    return {
      ok: false,
      message: `Unable to parse .codex/hooks.json: ${readErrorMessage(error)}`,
    };
  }
}

function mergeParsedHookConfig(
  options: CodexHookInstallOptions,
  existingContent: string,
  parsedConfig: unknown,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  const mergeResult = mergeVoiceLintCodexHooks(parsedConfig);
  return mergeResult.ok
    ? writeMergedHookConfig(options, existingContent, mergeResult.changed, mergeResult.config, actions)
    : Promise.resolve(ok(createManualResolutionResult(mergeResult.message)));
}

function writeMergedHookConfig(
  options: CodexHookInstallOptions,
  existingContent: string,
  changed: boolean,
  config: unknown,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  return changed
    ? writeChangedHookConfig(options, existingContent, config, actions)
    : Promise.resolve(skipUnchangedHookConfig(actions));
}

async function writeChangedHookConfig(
  options: CodexHookInstallOptions,
  existingContent: string,
  config: unknown,
  actions: CodexHookInstallAction[],
): Promise<Result<CodexHookInstallResult, ReturnType<typeof createInternalError>>> {
  const backupPath = `${codexHookFiles.hooksConfig}.bak.${readTimestamp(options)}`;
  const backupResult = await writeTextFile(join(options.cwd, backupPath), existingContent);
  if (!backupResult.ok) {
    return backupResult;
  }

  const writeResult = await writeTextFile(join(options.cwd, codexHookFiles.hooksConfig), stringifyHookConfig(config));
  if (!writeResult.ok) {
    return writeResult;
  }

  actions.push({ action: "backed-up", path: backupPath });
  actions.push({ action: "updated", path: codexHookFiles.hooksConfig });
  return ok({ status: "installed", actions });
}

function skipUnchangedHookConfig(
  actions: CodexHookInstallAction[],
): Result<CodexHookInstallResult, ReturnType<typeof createInternalError>> {
  actions.push({ action: "skipped", path: codexHookFiles.hooksConfig });
  return ok({ status: "installed", actions });
}

async function installHookScripts(
  cwd: string,
  actions: CodexHookInstallAction[],
): Promise<Result<void, ReturnType<typeof createInternalError>>> {
  const postToolUseResult = await installGeneratedFile(
    cwd,
    codexHookFiles.postToolUseScript,
    createPostToolUseHookScript(),
    actions,
  );
  return postToolUseResult.ok
    ? installGeneratedFile(cwd, codexHookFiles.stopScript, createStopHookScript(), actions)
    : postToolUseResult;
}

async function installGeneratedFile(
  cwd: string,
  relativePath: string,
  content: string,
  actions: CodexHookInstallAction[],
): Promise<Result<void, ReturnType<typeof createInternalError>>> {
  const absolutePath = join(cwd, relativePath);
  const existingFileResult = await readExistingFile(absolutePath, relativePath);
  if (!existingFileResult.ok) {
    return existingFileResult;
  }

  return applyGeneratedFilePlan(absolutePath, relativePath, content, existingFileResult.value, actions);
}

function applyGeneratedFilePlan(
  absolutePath: string,
  relativePath: string,
  content: string,
  existingFile: ExistingFile,
  actions: CodexHookInstallAction[],
): Promise<Result<void, ReturnType<typeof createInternalError>>> {
  return existingFile.state === "present" && existingFile.content === content
    ? Promise.resolve(recordSkippedGeneratedFile(relativePath, actions))
    : writeGeneratedFile(absolutePath, relativePath, content, existingFile.state, actions);
}

async function writeGeneratedFile(
  absolutePath: string,
  relativePath: string,
  content: string,
  existingState: ExistingFile["state"],
  actions: CodexHookInstallAction[],
): Promise<Result<void, ReturnType<typeof createInternalError>>> {
  const writeResult = await writeTextFile(absolutePath, content);
  if (!writeResult.ok) {
    return writeResult;
  }

  actions.push({ action: existingState === "missing" ? "created" : "updated", path: relativePath });
  return ok(undefined);
}

function recordSkippedGeneratedFile(
  relativePath: string,
  actions: CodexHookInstallAction[],
): Result<void, ReturnType<typeof createInternalError>> {
  actions.push({ action: "skipped", path: relativePath });
  return ok(undefined);
}

async function readExistingFile(
  absolutePath: string,
  relativePath: string,
): Promise<Result<ExistingFile, ReturnType<typeof createInternalError>>> {
  try {
    return ok({ state: "present", content: await readFile(absolutePath, "utf8") });
  } catch (error) {
    return readErrorCode(error) === "ENOENT"
      ? ok({ state: "missing" })
      : err(createInternalError(`Unable to read ${relativePath}: ${readErrorMessage(error)}`));
  }
}

async function writeTextFile(
  absolutePath: string,
  content: string,
): Promise<Result<void, ReturnType<typeof createInternalError>>> {
  try {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
    return ok(undefined);
  } catch (error) {
    return err(createInternalError(`Unable to write ${absolutePath}: ${readErrorMessage(error)}`));
  }
}

function stringifyHookConfig(config: unknown): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function createManualResolutionResult(message: string): CodexHookInstallManualResolution {
  return {
    status: "manual-resolution",
    message: [
      "VoiceLint Codex hook setup requires manual resolution.",
      message,
      "Inspect `.codex/hooks.json`, fix the JSON or merge the VoiceLint hooks manually, then re-run `voicelint init --agent codex`.",
      "VoiceLint did not overwrite `.codex/hooks.json` and did not write hook scripts.",
    ].join("\n"),
  };
}

function readTimestamp(options: CodexHookInstallOptions): string {
  return options.timestampProvider?.() ?? createUtcTimestamp(new Date());
}

function createUtcTimestamp(date: Date): string {
  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
    padDatePart(date.getUTCHours()),
    padDatePart(date.getUTCMinutes()),
    padDatePart(date.getUTCSeconds()),
  ].join("");
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function readErrorCode(error: unknown): string | undefined {
  return isErrorWithCode(error) ? error.code : undefined;
}

function isErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && typeof error.code === "string";
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}
