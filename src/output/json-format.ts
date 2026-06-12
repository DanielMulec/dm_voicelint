import type { Diagnostic } from "../diagnostics/diagnostic.js";
import type { DiagnosticSummary } from "./summary.js";

interface JsonDiagnosticOutput {
  readonly summary: DiagnosticSummary;
  readonly diagnostics: readonly Diagnostic[];
}

interface JsonErrorOutput {
  readonly error: {
    readonly message: string;
  };
}

export function formatJsonDiagnostics(
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): string {
  return `${JSON.stringify(createJsonDiagnosticOutput(summary, diagnostics), null, 2)}\n`;
}

export function formatJsonLintError(message: string): string {
  return `${JSON.stringify(createJsonErrorOutput(message), null, 2)}\n`;
}

function createJsonDiagnosticOutput(
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): JsonDiagnosticOutput {
  return {
    summary,
    diagnostics,
  };
}

function createJsonErrorOutput(message: string): JsonErrorOutput {
  return {
    error: {
      message,
    },
  };
}
