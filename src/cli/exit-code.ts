export const exitCodes = {
  success: 0,
  blockingDiagnostics: 1,
  failure: 2,
} as const;

export type ExitCode = (typeof exitCodes)[keyof typeof exitCodes];
