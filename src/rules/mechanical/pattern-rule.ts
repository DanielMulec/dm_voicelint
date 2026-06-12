import {
  createDiagnostic,
  type Diagnostic,
} from "../../diagnostics/create-diagnostic.js";
import type { LineIndex } from "../../locations/line-index.js";
import type { TextSegment } from "../../segments/segment.js";
import type { LoadedPatternRule } from "../rule-schema.js";
import {
  findLiteralSegmentMatches,
  findRegexSegmentMatches,
} from "./match-helpers.js";

export function evaluatePatternRule(
  rule: LoadedPatternRule,
  filePath: string,
  profile: string,
  lineIndex: LineIndex,
  segment: TextSegment,
): readonly Diagnostic[] {
  const matches = rule.matcher.regex
    ? findRegexSegmentMatches(lineIndex, segment, rule.matcher.expression)
    : findLiteralSegmentMatches(lineIndex, segment, rule.matcher.pattern);

  return matches.map((match) =>
    createDiagnostic({
      file: filePath,
      profile,
      ruleId: rule.id,
      severity: rule.severity,
      message: rule.message,
      range: match.range,
    })
  );
}
