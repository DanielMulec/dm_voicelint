import type { SourceRange } from "../locations/range.js";
import type { RuleSeverity } from "../rules/rule-schema.js";

export interface Diagnostic {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly profile: string;
  readonly ruleId: string;
  readonly severity: RuleSeverity;
  readonly message: string;
  readonly suggestion?: string;
}

export interface CreateDiagnosticInput {
  readonly file: string;
  readonly profile: string;
  readonly ruleId: string;
  readonly severity: RuleSeverity;
  readonly message: string;
  readonly range: SourceRange;
  readonly suggestion?: string;
}

export function createDiagnostic(input: CreateDiagnosticInput): Diagnostic {
  const baseDiagnostic = {
    file: input.file,
    line: input.range.line,
    column: input.range.column,
    endLine: input.range.endLine,
    endColumn: input.range.endColumn,
    profile: input.profile,
    ruleId: input.ruleId,
    severity: input.severity,
    message: input.message,
  };

  return typeof input.suggestion === "string" && input.suggestion.length > 0
    ? {
        ...baseDiagnostic,
        suggestion: input.suggestion,
      }
    : baseDiagnostic;
}

export function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
  return [
    left.file.localeCompare(right.file),
    left.line - right.line,
    left.column - right.column,
    left.ruleId.localeCompare(right.ruleId),
    left.endLine - right.endLine,
    left.endColumn - right.endColumn,
  ].find((comparison) => comparison !== 0) ?? 0;
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
  return [
    diagnostic.file,
    diagnostic.ruleId,
    diagnostic.line,
    diagnostic.column,
    diagnostic.endLine,
    diagnostic.endColumn,
  ].join(":");
}
