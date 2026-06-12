import type { Diagnostic } from "../diagnostics/diagnostic.js";
import type { LineIndex } from "../locations/line-index.js";
import type { TextSegment } from "../segments/segment.js";
import { evaluatePatternRule } from "./mechanical/pattern-rule.js";
import { evaluateSubstitutionRule } from "./mechanical/substitution-rule.js";
import { evaluateTermsRule } from "./mechanical/terms-rule.js";
import type { LoadedMechanicalRule } from "./rule-schema.js";

export function evaluateRules(
  segments: readonly TextSegment[],
  rules: readonly LoadedMechanicalRule[],
  filePath: string,
  profile: string,
  lineIndex: LineIndex,
): readonly Diagnostic[] {
  return segments.flatMap((segment) =>
    rules.flatMap((rule) =>
      evaluateSingleRule(rule, filePath, profile, lineIndex, segment)
    )
  );
}

function evaluateSingleRule(
  rule: LoadedMechanicalRule,
  filePath: string,
  profile: string,
  lineIndex: LineIndex,
  segment: TextSegment,
): readonly Diagnostic[] {
  if (rule.kind === "pattern") {
    return evaluatePatternRule(rule, filePath, profile, lineIndex, segment);
  }

  return rule.kind === "terms"
    ? evaluateTermsRule(rule, filePath, profile, lineIndex, segment)
    : evaluateSubstitutionRule(rule, filePath, profile, lineIndex, segment);
}
