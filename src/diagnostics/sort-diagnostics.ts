import type { Diagnostic } from "./diagnostic.js";

export function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
  return readFirstNonZeroComparison([
    left.file.localeCompare(right.file),
    left.line - right.line,
    left.column - right.column,
    left.endLine - right.endLine,
    left.endColumn - right.endColumn,
    left.ruleId.localeCompare(right.ruleId),
    left.severity.localeCompare(right.severity),
    left.message.localeCompare(right.message),
    (left.suggestion ?? "").localeCompare(right.suggestion ?? ""),
  ]);
}

export function sortDiagnostics(
  diagnostics: readonly Diagnostic[],
): readonly Diagnostic[] {
  return [...diagnostics].sort(compareDiagnostics);
}

export function deduplicateDiagnostics(
  diagnostics: readonly Diagnostic[],
): readonly Diagnostic[] {
  const seenDiagnosticKeys = new Set<string>();
  const uniqueDiagnostics: Diagnostic[] = [];

  for (const diagnostic of diagnostics) {
    const diagnosticKey = createDiagnosticKey(diagnostic);
    if (seenDiagnosticKeys.has(diagnosticKey)) {
      continue;
    }

    seenDiagnosticKeys.add(diagnosticKey);
    uniqueDiagnostics.push(diagnostic);
  }

  return uniqueDiagnostics;
}

function createDiagnosticKey(diagnostic: Diagnostic): string {
  return JSON.stringify([
    diagnostic.file,
    diagnostic.line,
    diagnostic.column,
    diagnostic.endLine,
    diagnostic.endColumn,
    diagnostic.profile,
    diagnostic.ruleId,
    diagnostic.severity,
    diagnostic.message,
    diagnostic.suggestion ?? "",
  ]);
}

function readFirstNonZeroComparison(
  comparisons: readonly number[],
): number {
  for (const comparison of comparisons) {
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}
