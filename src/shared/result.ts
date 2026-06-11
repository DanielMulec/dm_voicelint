import type { ExitCode } from "../cli/exit-code.js";
import type { AppError } from "./errors.js";

export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export interface CommandOutput {
  readonly exitCode: ExitCode;
  readonly stdoutText?: string;
  readonly stderrText?: string;
}

export type CommandResult = Result<CommandOutput, AppError>;

export const ok = <TValue>(value: TValue): Result<TValue, never> => ({
  ok: true,
  value,
});

export const err = <TError>(error: TError): Result<never, TError> => ({
  ok: false,
  error,
});
