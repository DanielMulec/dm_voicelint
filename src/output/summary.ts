import { resolveLintExitCode, type ExitCode } from "../cli/exit-code.js";
import type { Diagnostic } from "../diagnostics/diagnostic.js";

export interface DiagnosticSummary {
  readonly scannedFileCount: number;
  readonly diagnosticCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly exitCode: ExitCode;
}

export function createDiagnosticSummary(
  scannedFileCount: number,
  diagnostics: readonly Diagnostic[],
): DiagnosticSummary {
  const errorCount = countDiagnostics(diagnostics, "error");
  const warningCount = diagnostics.length - errorCount;

  return {
    scannedFileCount,
    diagnosticCount: diagnostics.length,
    errorCount,
    warningCount,
    exitCode: resolveLintExitCode(errorCount),
  };
}

export function formatSummaryLine(summary: DiagnosticSummary): string {
  return `${[
    `${summary.errorCount} ${pluralize("error", summary.errorCount)}`,
    `${summary.warningCount} ${pluralize("warning", summary.warningCount)}`,
  ].join(", ")} in ${summary.scannedFileCount} ${pluralize("file", summary.scannedFileCount)}`;
}

function countDiagnostics(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic["severity"],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity).length;
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}
