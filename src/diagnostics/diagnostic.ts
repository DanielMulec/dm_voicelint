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
