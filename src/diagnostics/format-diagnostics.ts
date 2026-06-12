import { exitCodes, type ExitCode } from "../cli/exit-code.js";
import type { OutputFormat } from "../cli/args.js";
import type { Diagnostic } from "./create-diagnostic.js";

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
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.length - errorCount;

  return {
    scannedFileCount,
    diagnosticCount: diagnostics.length,
    errorCount,
    warningCount,
    exitCode: errorCount > 0 ? exitCodes.blockingDiagnostics : exitCodes.success,
  };
}

export function formatDiagnostics(
  format: OutputFormat,
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): string {
  if (format === "json") {
    return formatJsonDiagnostics(summary, diagnostics);
  }

  return format === "agent"
    ? formatAgentDiagnostics(summary, diagnostics)
    : formatPrettyDiagnostics(summary, diagnostics);
}

export function formatLintErrorAsJson(message: string): string {
  return `${JSON.stringify({ error: { message } }, null, 2)}\n`;
}

function formatJsonDiagnostics(
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): string {
  return `${JSON.stringify({ summary, diagnostics }, null, 2)}\n`;
}

function formatAgentDiagnostics(
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): string {
  const diagnosticLines = diagnostics.flatMap(formatAgentDiagnostic);
  return [
    ...diagnosticLines,
    createSummaryLine(summary),
    "",
  ].join("\n");
}

function formatAgentDiagnostic(diagnostic: Diagnostic): readonly string[] {
  return typeof diagnostic.suggestion === "string"
    ? [
        `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} [${diagnostic.severity}] ${diagnostic.ruleId} ${diagnostic.message}`,
        `Suggestion: ${diagnostic.suggestion}`,
      ]
    : [
        `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} [${diagnostic.severity}] ${diagnostic.ruleId} ${diagnostic.message}`,
      ];
}

function formatPrettyDiagnostics(
  summary: DiagnosticSummary,
  diagnostics: readonly Diagnostic[],
): string {
  const groupedDiagnostics = groupDiagnosticsByFile(diagnostics);
  const prettyLines = groupedDiagnostics.flatMap(formatPrettyFileGroup);
  return [
    ...prettyLines,
    createSummaryLine(summary),
    "",
  ].join("\n");
}

function groupDiagnosticsByFile(
  diagnostics: readonly Diagnostic[],
): readonly { readonly file: string; readonly diagnostics: readonly Diagnostic[] }[] {
  const groupedDiagnostics = new Map<string, Diagnostic[]>();

  for (const diagnostic of diagnostics) {
    const fileDiagnostics = groupedDiagnostics.get(diagnostic.file) ?? [];
    fileDiagnostics.push(diagnostic);
    groupedDiagnostics.set(diagnostic.file, fileDiagnostics);
  }

  return [...groupedDiagnostics.entries()].map(([file, fileDiagnostics]) => ({
    file,
    diagnostics: fileDiagnostics,
  }));
}

function formatPrettyFileGroup(
  fileGroup: { readonly file: string; readonly diagnostics: readonly Diagnostic[] },
): readonly string[] {
  const diagnosticLines = fileGroup.diagnostics.flatMap((diagnostic) => [
    `  ${diagnostic.line}:${diagnostic.column}  ${padSeverity(diagnostic.severity)}  ${diagnostic.ruleId}  ${diagnostic.message}`,
    ...createPrettySuggestionLines(diagnostic.suggestion),
  ]);

  return [fileGroup.file, ...diagnosticLines, ""];
}

function createPrettySuggestionLines(
  suggestion: string | undefined,
): readonly string[] {
  return typeof suggestion === "string" ? [`    Suggestion: ${suggestion}`] : [];
}

function createSummaryLine(summary: DiagnosticSummary): string {
  return [
    `${summary.errorCount} ${pluralize("error", summary.errorCount)}`,
    `${summary.warningCount} ${pluralize("warning", summary.warningCount)}`,
    `in ${summary.scannedFileCount} ${pluralize("file", summary.scannedFileCount)}`,
  ].join(", ");
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`;
}

function padSeverity(severity: Diagnostic["severity"]): string {
  return severity === "error" ? "error  " : "warning";
}
