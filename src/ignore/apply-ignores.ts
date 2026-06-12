import type { Diagnostic } from "../diagnostics/diagnostic.js";
import type {
  IgnoreComment,
  IgnoreTarget,
  ParsedIgnoreComments,
} from "./ignore-comment.js";

interface IgnoreLineRange {
  readonly target: IgnoreTarget;
  readonly startLine: number;
  readonly endLine: number | null;
}

export function applyIgnores(
  diagnostics: readonly Diagnostic[],
  parsedIgnoreComments: ParsedIgnoreComments,
): readonly Diagnostic[] {
  const ignoreLineRanges = createIgnoreLineRanges(parsedIgnoreComments.comments);
  return diagnostics.filter((diagnostic) => !isIgnoredDiagnostic(diagnostic, ignoreLineRanges));
}

function createIgnoreLineRanges(
  ignoreComments: readonly IgnoreComment[],
): readonly IgnoreLineRange[] {
  const ignoreLineRanges: IgnoreLineRange[] = [];
  const activeDisableStartLines = new Map<string, number[]>();

  for (const ignoreComment of ignoreComments) {
    applyIgnoreCommentToRanges(ignoreLineRanges, activeDisableStartLines, ignoreComment);
  }

  return [...ignoreLineRanges, ...createOpenEndedIgnoreLineRanges(activeDisableStartLines)];
}

function applyIgnoreCommentToRanges(
  ignoreLineRanges: IgnoreLineRange[],
  activeDisableStartLines: Map<string, number[]>,
  ignoreComment: IgnoreComment,
): void {
  if (ignoreComment.kind === "disable-next-line") {
    ignoreLineRanges.push(
      createIgnoreLineRange(ignoreComment.target, ignoreComment.line + 1, ignoreComment.line + 1),
    );
    return;
  }

  applyBlockIgnoreComment(ignoreLineRanges, activeDisableStartLines, ignoreComment);
}

function applyBlockIgnoreComment(
  ignoreLineRanges: IgnoreLineRange[],
  activeDisableStartLines: Map<string, number[]>,
  ignoreComment: IgnoreComment,
): void {
  if (ignoreComment.kind === "disable") {
    pushActiveDisableStartLine(activeDisableStartLines, ignoreComment.target, ignoreComment.line + 1);
    return;
  }

  closeIgnoreRange(ignoreLineRanges, activeDisableStartLines, ignoreComment);
}

function pushActiveDisableStartLine(
  activeDisableStartLines: Map<string, number[]>,
  target: IgnoreTarget,
  startLine: number,
): void {
  const startLines = activeDisableStartLines.get(target) ?? [];
  startLines.push(startLine);
  activeDisableStartLines.set(target, startLines);
}

function closeIgnoreRange(
  ignoreLineRanges: IgnoreLineRange[],
  activeDisableStartLines: Map<string, number[]>,
  ignoreComment: IgnoreComment,
): void {
  const startLine = popActiveDisableStartLine(activeDisableStartLines, ignoreComment.target);
  if (startLine === undefined) {
    return;
  }

  const endLine = ignoreComment.line - 1;
  if (startLine <= endLine) {
    ignoreLineRanges.push(createIgnoreLineRange(ignoreComment.target, startLine, endLine));
  }
}

function popActiveDisableStartLine(
  activeDisableStartLines: Map<string, number[]>,
  target: IgnoreTarget,
): number | undefined {
  const startLines = activeDisableStartLines.get(target);
  const startLine = startLines?.pop();
  clearEmptyDisableStartLines(activeDisableStartLines, target, startLines);
  return startLine;
}

function clearEmptyDisableStartLines(
  activeDisableStartLines: Map<string, number[]>,
  target: IgnoreTarget,
  startLines: number[] | undefined,
): void {
  if (startLines !== undefined && startLines.length === 0) {
    activeDisableStartLines.delete(target);
  }
}

function createOpenEndedIgnoreLineRanges(
  activeDisableStartLines: Map<string, number[]>,
): readonly IgnoreLineRange[] {
  return [...activeDisableStartLines.entries()].flatMap(([target, startLines]) =>
    startLines.map((startLine) => createIgnoreLineRange(target, startLine, null))
  );
}

function createIgnoreLineRange(
  target: IgnoreTarget,
  startLine: number,
  endLine: number | null,
): IgnoreLineRange {
  return {
    target,
    startLine,
    endLine,
  };
}

function isIgnoredDiagnostic(
  diagnostic: Diagnostic,
  ignoreLineRanges: readonly IgnoreLineRange[],
): boolean {
  return ignoreLineRanges.some((ignoreLineRange) =>
    matchesIgnoreLineRange(ignoreLineRange, diagnostic)
  );
}

function matchesIgnoreLineRange(
  ignoreLineRange: IgnoreLineRange,
  diagnostic: Diagnostic,
): boolean {
  return matchesIgnoreTarget(ignoreLineRange.target, diagnostic.ruleId)
    && diagnostic.line <= readLastIgnoredLine(ignoreLineRange)
    && readDiagnosticLastCoveredLine(diagnostic) >= ignoreLineRange.startLine;
}

function matchesIgnoreTarget(target: IgnoreTarget, ruleId: string): boolean {
  return target === "all" || target === ruleId;
}

function readLastIgnoredLine(ignoreLineRange: IgnoreLineRange): number {
  return ignoreLineRange.endLine ?? Number.MAX_SAFE_INTEGER;
}

function readDiagnosticLastCoveredLine(diagnostic: Diagnostic): number {
  return diagnostic.endColumn === 1 && diagnostic.endLine > diagnostic.line
    ? diagnostic.endLine - 1
    : diagnostic.endLine;
}
