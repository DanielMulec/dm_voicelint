import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd as readCurrentWorkingDirectory } from "node:process";

import { parseDocument } from "yaml";

import type { AppError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import {
  createConfigParseError,
  createConfigReadError,
  createMissingConfigError,
} from "./config-errors.js";
import {
  defaultConfigFilePath,
} from "./config-schema.js";
import {
  validateVoiceLintConfig,
  type ValidatedVoiceLintConfig,
} from "./validate-config.js";

export interface LoadConfigOptions {
  readonly cwd?: string;
}

export type LoadedVoiceLintConfig = ValidatedVoiceLintConfig;

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
    ? validateVoiceLintConfig(configFilePath, configValueResult.value)
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
  return error instanceof Error
    && "code" in error
    && typeof error.code === "string";
}

function readErrorDetails(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown file-system failure.";
}

function parseConfigSource(
  configFilePath: string,
  configSource: string,
): Result<unknown, AppError> {
  const parsedDocument = parseDocument(configSource);
  const configValue: unknown = parsedDocument.toJS();
  return parsedDocument.errors.length === 0
    ? ok(configValue)
    : err(createConfigParseError(configFilePath, readYamlErrorText(parsedDocument.errors)));
}

function readYamlErrorText(
  errors: readonly Error[],
): string {
  return errors.map((error) => error.message).join(" ");
}

function resolveConfigFilePath(cwd: string, configPath: string | undefined): string {
  return resolve(cwd, configPath ?? defaultConfigFilePath);
}
