import type { AppError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import { createConfigValidationError } from "./config-errors.js";
import {
  voiceLintConfigSchema,
  type VoiceLintConfig,
} from "./config-schema.js";

export interface ValidatedVoiceLintConfig extends VoiceLintConfig {
  readonly configFilePath: string;
}

// Keep schema validation separate from config file IO so future config sources
// cannot accidentally fork the accepted repo-local configuration shape.
export function validateVoiceLintConfig(
  configFilePath: string,
  configValue: unknown,
): Result<ValidatedVoiceLintConfig, AppError> {
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

function formatConfigIssue(issue: { readonly path: readonly PropertyKey[]; readonly message: string }): string {
  const issuePath = readIssuePath(issue.path);
  return issuePath.length === 0 ? issue.message : `${issuePath}: ${issue.message}`;
}

function readIssuePath(path: readonly PropertyKey[]): string {
  return path.map((pathSegment) => String(pathSegment)).join(".");
}
