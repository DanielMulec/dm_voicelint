import type { Diagnostic } from "../diagnostics/diagnostic.js";
import {
  formatSummaryLine,
  type DiagnosticSummary,
} from "./summary.js";

export function formatAgentDiagnostics(
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): string {
  return `${[
    ...diagnostics.flatMap(formatAgentDiagnostic),
    `Summary: ${formatSummaryLine(summary)}`,
  ].join("\n")}\n`;
}

function formatAgentDiagnostic(diagnostic: Diagnostic): readonly string[] {
  return typeof diagnostic.suggestion === "string"
    ? [
        createAgentDiagnosticLine(diagnostic),
        `Suggestion: ${diagnostic.suggestion}`,
      ]
    : [createAgentDiagnosticLine(diagnostic)];
}

function createAgentDiagnosticLine(diagnostic: Diagnostic): string {
  return `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} [${diagnostic.severity}] ${diagnostic.ruleId} ${diagnostic.message}`;
}
