import { exitCodes, type ExitCode } from "../cli/exit-code.js";

export interface AppError {
  readonly exitCode: ExitCode;
  readonly message: string;
}

export const createUsageError = (message: string): AppError => ({
  exitCode: exitCodes.failure,
  message,
});

export const createInternalError = (message: string): AppError => ({
  exitCode: exitCodes.failure,
  message,
});
