import { exitCodes } from "../cli/exit-code.js";
import type { AppError } from "../shared/errors.js";

export const createMissingConfigError = (
  configFilePath: string,
): AppError => createConfigError(
  `VoiceLint config not found: ${configFilePath}. Run \`voicelint init\` to create the baseline repo-local setup.`,
);

export const createConfigReadError = (
  configFilePath: string,
  details: string,
): AppError => createConfigError(
  `Unable to read VoiceLint config at ${configFilePath}: ${details}`,
);

export const createConfigParseError = (
  configFilePath: string,
  details: string,
): AppError => createConfigError(
  `Unable to parse VoiceLint config at ${configFilePath}: ${details}`,
);

export const createConfigValidationError = (
  configFilePath: string,
  details: readonly string[],
): AppError => createConfigError([
  `Invalid VoiceLint config at ${configFilePath}:`,
  ...details.map((detail) => `- ${detail}`),
].join("\n"));

function createConfigError(message: string): AppError {
  return {
    exitCode: exitCodes.failure,
    message,
  };
}
