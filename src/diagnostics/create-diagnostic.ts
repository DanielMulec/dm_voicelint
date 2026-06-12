import type { SourceRange } from "../locations/range.js";
import type { RuleSeverity } from "../rules/rule-schema.js";
import type { Diagnostic } from "./diagnostic.js";

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
