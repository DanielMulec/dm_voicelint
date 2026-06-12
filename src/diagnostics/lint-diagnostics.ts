import type { TextSource } from "../input/read-source.js";
import { applyIgnores } from "../ignore/apply-ignores.js";
import { parseIgnoreComments } from "../ignore/ignore-parser.js";
import { createLineIndex } from "../locations/line-index.js";
import { evaluateRules } from "../rules/evaluate-rules.js";
import type { LoadedMechanicalRule } from "../rules/rule-schema.js";
import { createSourceSegments } from "../segments/source-segments.js";
import type { Diagnostic } from "./diagnostic.js";
import {
  deduplicateDiagnostics,
  sortDiagnostics,
} from "./sort-diagnostics.js";

// This pipeline is the only place that composes source segmentation, mechanical
// rule evaluation, ignore handling, and final diagnostic ordering.
export function createLintDiagnostics(
  sources: readonly TextSource[],
  rules: readonly LoadedMechanicalRule[],
  profile: string,
): readonly Diagnostic[] {
  return sortDiagnostics(
    deduplicateDiagnostics(
      sources.flatMap((source) => createSourceDiagnostics(source, rules, profile)),
    ),
  );
}

function createSourceDiagnostics(
  source: TextSource,
  rules: readonly LoadedMechanicalRule[],
  profile: string,
): readonly Diagnostic[] {
  const sourceSegments = createSourceSegments(source);
  const sourceDiagnostics = evaluateRules(
    sourceSegments.segments,
    rules,
    source.path,
    profile,
    createLineIndex(source.content),
  );

  return sourceSegments.isMarkdownSource
    ? applyIgnores(sourceDiagnostics, parseIgnoreComments(source.content))
    : sourceDiagnostics;
}
