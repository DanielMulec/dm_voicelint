import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd as readCurrentWorkingDirectory } from "node:process";

import { parseDocument } from "yaml";
import type { ZodIssue } from "zod";

import type { AppError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import {
  createConfigParseError,
  createConfigReadError,
  createConfigValidationError,
  createMissingConfigError,
} from "./config-errors.js";
import {
  defaultConfigFilePath,
  voiceLintConfigSchema,
  type VoiceLintConfig,
} from "./config-schema.js";

export interface LoadConfigOptions {
  readonly cwd?: string;
}

export interface LoadedVoiceLintConfig extends VoiceLintConfig {
  readonly configFilePath: string;
}

export async function loadVoiceLintConfig(
  configPath: string | undefined,
  options: LoadConfigOptions = {},
): Promise<Result<LoadedVoiceLintConfig, AppError>> {
  const cwd = options.cwd ?? readCurrentWorkingDirectory();
  return loadResolvedConfig(resolveConfigFilePath(cwd, configPath));
}

async function loadResolvedConfig(
  configFilePath: string,
): Promise<Result<LoadedVoiceLintConfig, AppError>> {
  const configSourceResult = await readConfigSource(configFilePath);
  if (!configSourceResult.ok) {
    return configSourceResult;
  }

  return parseLoadedConfig(configFilePath, configSourceResult.value);
}

function parseLoadedConfig(
  configFilePath: string,
  configSource: string,
): Result<LoadedVoiceLintConfig, AppError> {
  const configValueResult = parseConfigSource(configFilePath, configSource);
  return configValueResult.ok
    ? validateConfigValue(configFilePath, configValueResult.value)
    : configValueResult;
}

async function readConfigSource(
  configFilePath: string,
): Promise<Result<string, AppError>> {
  try {
    return ok(await readFile(configFilePath, "utf8"));
  } catch (error) {
    return err(readConfigReadError(configFilePath, error));
  }
}

function readConfigReadError(
  configFilePath: string,
  error: unknown,
): AppError {
  return isMissingFileError(error)
    ? createMissingConfigError(configFilePath)
    : createConfigReadError(configFilePath, readErrorDetails(error));
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return readErrorCode(error) === "ENOENT";
}

function readErrorCode(error: unknown): string | undefined {
  return isErrorWithCode(error) ? error.code : undefined;
}

function isErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  const errnoError = error as NodeJS.ErrnoException;
  return error instanceof Error && typeof errnoError.code === "string";
}

function readErrorDetails(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown file-system failure.";
}

function parseConfigSource(
  configFilePath: string,
  configSource: string,
): Result<unknown, AppError> {
  const parsedDocument = parseDocument(configSource);
  return parsedDocument.errors.length === 0
    ? ok(parsedDocument.toJS() as unknown)
    : err(createConfigParseError(configFilePath, readYamlErrorText(parsedDocument.errors)));
}

function readYamlErrorText(
  errors: readonly Error[],
): string {
  return errors.map((error) => error.message).join(" ");
}

function validateConfigValue(
  configFilePath: string,
  configValue: unknown,
): Result<LoadedVoiceLintConfig, AppError> {
  const parsedConfig = voiceLintConfigSchema.safeParse(configValue);
  return parsedConfig.success
    ? ok({
        ...parsedConfig.data,
        configFilePath,
      })
    : err(
        createConfigValidationError(
          configFilePath,
          parsedConfig.error.issues.map(formatConfigIssue),
        ),
      );
}

function formatConfigIssue(issue: ZodIssue): string {
  const issuePath = readIssuePath(issue.path);
  return issuePath.length === 0 ? issue.message : `${issuePath}: ${issue.message}`;
}

function readIssuePath(path: readonly PropertyKey[]): string {
  return path.map((segment) => String(segment)).join(".");
}

function resolveConfigFilePath(cwd: string, configPath: string | undefined): string {
  return resolve(cwd, configPath ?? defaultConfigFilePath);
}
