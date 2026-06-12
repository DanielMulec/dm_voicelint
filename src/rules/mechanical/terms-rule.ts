import {
  createDiagnostic,
} from "../../diagnostics/create-diagnostic.js";
import type { Diagnostic } from "../../diagnostics/diagnostic.js";
import type { LineIndex } from "../../locations/line-index.js";
import type { TextSegment } from "../../segments/segment.js";
import type { LoadedTermsRule } from "../rule-schema.js";
import { findLiteralSegmentMatches } from "./match-helpers.js";

export function evaluateTermsRule(
  rule: LoadedTermsRule,
  filePath: string,
  profile: string,
  lineIndex: LineIndex,
  segment: TextSegment,
): readonly Diagnostic[] {
  return rule.terms.flatMap((termEntry) =>
    findLiteralSegmentMatches(lineIndex, segment, termEntry.discouraged).map((match) =>
      createDiagnostic({
        file: filePath,
        profile,
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        range: match.range,
        suggestion: `Use "${termEntry.replacement}" instead of "${termEntry.discouraged}".`,
      })
    )
  );
}
