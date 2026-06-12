import { extname } from "node:path";

import {
  compareDiagnostics,
  deduplicateDiagnostics,
  type Diagnostic,
} from "../diagnostics/create-diagnostic.js";
import { createLineIndex } from "../locations/line-index.js";
import type { TextSource } from "../input/read-source.js";
import { createMarkdownSegments } from "../segments/markdown-segments.js";
import { createPlainTextSegments } from "../segments/plain-text-segments.js";
import type { TextSegment } from "../segments/segment.js";
import { evaluatePatternRule } from "./mechanical/pattern-rule.js";
import { evaluateSubstitutionRule } from "./mechanical/substitution-rule.js";
import { evaluateTermsRule } from "./mechanical/terms-rule.js";
import type { LoadedMechanicalRule } from "./rule-schema.js";

export function evaluateRules(
  sources: readonly TextSource[],
  rules: readonly LoadedMechanicalRule[],
  profile: string,
): readonly Diagnostic[] {
  return sortDiagnostics(
    deduplicateDiagnostics(
      sources.flatMap((source) => evaluateSourceRules(source, rules, profile)),
    ),
  );
}

function evaluateSourceRules(
  source: TextSource,
  rules: readonly LoadedMechanicalRule[],
  profile: string,
): readonly Diagnostic[] {
  const lineIndex = createLineIndex(source.content);
  return readRuleSegments(source).flatMap((segment) =>
    rules.flatMap((rule) =>
      evaluateSingleRule(rule, source.path, profile, lineIndex, segment)
    )
  );
}

function evaluateSingleRule(
  rule: LoadedMechanicalRule,
  filePath: string,
  profile: string,
  lineIndex: ReturnType<typeof createLineIndex>,
  segment: TextSegment,
): readonly Diagnostic[] {
  if (rule.kind === "pattern") {
    return evaluatePatternRule(rule, filePath, profile, lineIndex, segment);
  }

  return rule.kind === "terms"
    ? evaluateTermsRule(rule, filePath, profile, lineIndex, segment)
    : evaluateSubstitutionRule(rule, filePath, profile, lineIndex, segment);
}

function readRuleSegments(source: TextSource): readonly TextSegment[] {
  return isMarkdownSource(source.path)
    ? createMarkdownSegments(source.content)
    : createPlainTextSegments(source.content).filter((segment) => segment.kind === "paragraph");
}

function sortDiagnostics(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  return [...diagnostics].sort(compareDiagnostics);
}

function isMarkdownSource(sourcePath: string): boolean {
  const fileExtension = extname(sourcePath).toLowerCase();
  return fileExtension === ".md" || fileExtension === ".mdx";
}
