import type { Diagnostic } from "../diagnostics/diagnostic.js";
import { sortDiagnostics } from "../diagnostics/sort-diagnostics.js";
import {
  formatSummaryLine,
  type DiagnosticSummary,
} from "./summary.js";

export function formatPrettyDiagnostics(
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): string {
  const sortedDiagnostics = sortDiagnostics(diagnostics);
  const diagnosticLines = sortedDiagnostics.flatMap(formatPrettyDiagnostic);
  return diagnosticLines.length === 0
    ? `${formatSummaryLine(summary)}\n`
    : `${diagnosticLines.join("\n")}\n\n${formatSummaryLine(summary)}\n`;
}

function formatPrettyDiagnostic(diagnostic: Diagnostic): readonly string[] {
  return typeof diagnostic.suggestion === "string"
    ? [createPrettyDiagnosticLine(diagnostic), `  Suggestion: ${diagnostic.suggestion}`]
    : [createPrettyDiagnosticLine(diagnostic)];
}

function createPrettyDiagnosticLine(diagnostic: Diagnostic): string {
  return [
    `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}`,
    diagnostic.severity.padEnd(7, " "),
    diagnostic.ruleId,
    diagnostic.message,
  ].join("  ");
}
