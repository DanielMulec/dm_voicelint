import {
  createDiagnostic,
  type Diagnostic,
} from "../../diagnostics/create-diagnostic.js";
import type { LineIndex } from "../../locations/line-index.js";
import type { TextSegment } from "../../segments/segment.js";
import type { LoadedSubstitutionRule } from "../rule-schema.js";
import { findLiteralSegmentMatches } from "./match-helpers.js";

export function evaluateSubstitutionRule(
  rule: LoadedSubstitutionRule,
  filePath: string,
  profile: string,
  lineIndex: LineIndex,
  segment: TextSegment,
): readonly Diagnostic[] {
  return rule.substitutions.flatMap((substitutionEntry) =>
    findLiteralSegmentMatches(lineIndex, segment, substitutionEntry.discouraged).map((match) =>
      createDiagnostic({
        file: filePath,
        profile,
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        range: match.range,
        suggestion: `Replace "${substitutionEntry.discouraged}" with "${substitutionEntry.replacement}".`,
      })
    )
  );
}
