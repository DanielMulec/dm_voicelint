import type { LineIndex } from "../../locations/line-index.js";
import { createSourceRange, type SourceRange } from "../../locations/range.js";
import type { TextSegment } from "../../segments/segment.js";

export interface SegmentMatch {
  readonly range: SourceRange;
  readonly matchedText: string;
}

export function findLiteralSegmentMatches(
  lineIndex: LineIndex,
  segment: TextSegment,
  literal: string,
): readonly SegmentMatch[] {
  const matches: SegmentMatch[] = [];
  let nextSearchOffset = 0;

  while (nextSearchOffset < segment.text.length) {
    const matchOffset = segment.text.indexOf(literal, nextSearchOffset);
    if (matchOffset === -1) {
      return matches;
    }

    appendSegmentMatch(matches, lineIndex, segment, matchOffset, literal.length);
    nextSearchOffset = matchOffset + literal.length;
  }

  return matches;
}

export function findRegexSegmentMatches(
  lineIndex: LineIndex,
  segment: TextSegment,
  expression: RegExp,
): readonly SegmentMatch[] {
  const matches: SegmentMatch[] = [];
  const segmentExpression = new RegExp(expression.source, expression.flags);
  let nextMatch = segmentExpression.exec(segment.text);

  while (nextMatch !== null) {
    appendRegexMatch(matches, lineIndex, segment, segmentExpression, nextMatch);
    nextMatch = segmentExpression.exec(segment.text);
  }

  return matches;
}

function appendRegexMatch(
  matches: SegmentMatch[],
  lineIndex: LineIndex,
  segment: TextSegment,
  segmentExpression: RegExp,
  regexMatch: RegExpExecArray,
): void {
  const matchedText = regexMatch[0];
  if (matchedText.length === 0) {
    segmentExpression.lastIndex = regexMatch.index + 1;
    return;
  }

  appendSegmentMatch(matches, lineIndex, segment, regexMatch.index, matchedText.length);
}

function appendSegmentMatch(
  matches: SegmentMatch[],
  lineIndex: LineIndex,
  segment: TextSegment,
  localStartOffset: number,
  matchLength: number,
): void {
  const startOffset = segment.range.startOffset + localStartOffset;
  const endOffset = startOffset + matchLength;
  if (isExcludedLiteralRange(segment, startOffset, endOffset)) {
    return;
  }

  matches.push({
    range: createSourceRange(lineIndex, {
      startOffset,
      endOffset,
    }),
    matchedText: segment.text.slice(localStartOffset, localStartOffset + matchLength),
  });
}

function isExcludedLiteralRange(
  segment: TextSegment,
  startOffset: number,
  endOffset: number,
): boolean {
  return segment.literalExclusionRanges.some((exclusionRange) =>
    rangesOverlap(
      startOffset,
      endOffset,
      exclusionRange.startOffset,
      exclusionRange.endOffset,
    )
  );
}

function rangesOverlap(
  leftStartOffset: number,
  leftEndOffset: number,
  rightStartOffset: number,
  rightEndOffset: number,
): boolean {
  return leftStartOffset < rightEndOffset && rightStartOffset < leftEndOffset;
}
