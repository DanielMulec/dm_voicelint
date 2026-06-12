import type { OffsetRange } from "../locations/range.js";

interface InlineCodeRun {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly markerLength: number;
}

export function collectInlineCodeRanges(
  sourceText: string,
  segmentRange: OffsetRange,
): readonly OffsetRange[] {
  const segmentText = sourceText.slice(segmentRange.startOffset, segmentRange.endOffset);
  const inlineCodeRanges: OffsetRange[] = [];
  let nextSearchOffset = 0;

  while (nextSearchOffset < segmentText.length) {
    const nextInlineCodeRange = readNextInlineCodeRange(
      segmentText,
      segmentRange.startOffset,
      nextSearchOffset,
    );
    if (nextInlineCodeRange === null) {
      return inlineCodeRanges;
    }

    appendInlineCodeRange(inlineCodeRanges, nextInlineCodeRange.range);
    nextSearchOffset = nextInlineCodeRange.nextSearchOffset;
  }

  return inlineCodeRanges;
}

function readNextInlineCodeRange(
  segmentText: string,
  segmentStartOffset: number,
  nextSearchOffset: number,
): { readonly nextSearchOffset: number; readonly range: OffsetRange | null } | null {
  const openingRun = readNextInlineCodeRun(segmentText, nextSearchOffset);
  if (openingRun === null) {
    return null;
  }

  const closingRun = readClosingInlineCodeRun(segmentText, openingRun);
  return closingRun === null
    ? {
        nextSearchOffset: openingRun.endOffset,
        range: null,
      }
    : {
        nextSearchOffset: closingRun.endOffset,
        range: {
          startOffset: segmentStartOffset + openingRun.startOffset,
          endOffset: segmentStartOffset + closingRun.endOffset,
        },
      };
}

function appendInlineCodeRange(
  inlineCodeRanges: OffsetRange[],
  inlineCodeRange: OffsetRange | null,
): void {
  if (inlineCodeRange !== null) {
    inlineCodeRanges.push(inlineCodeRange);
  }
}

function readNextInlineCodeRun(
  segmentText: string,
  startOffset: number,
): InlineCodeRun | null {
  const openingOffset = segmentText.indexOf("`", startOffset);
  return openingOffset === -1 ? null : createInlineCodeRun(segmentText, openingOffset);
}

function readClosingInlineCodeRun(
  segmentText: string,
  openingRun: InlineCodeRun,
): InlineCodeRun | null {
  let nextSearchOffset = openingRun.endOffset;

  while (nextSearchOffset < segmentText.length) {
    const closingRun = readNextInlineCodeRun(segmentText, nextSearchOffset);
    // Markdown inline code closes only on a backtick run of equal length. Shorter
    // or longer runs stay searchable text and must not end the exclusion range.
    if (shouldStopClosingInlineCodeSearch(openingRun, closingRun)) {
      return closingRun;
    }

    nextSearchOffset = readInlineCodeRunEndOffset(closingRun);
  }

  return null;
}

function shouldStopClosingInlineCodeSearch(
  openingRun: InlineCodeRun,
  closingRun: InlineCodeRun | null,
): boolean {
  return closingRun === null || closingRun.markerLength === openingRun.markerLength;
}

function readInlineCodeRunEndOffset(inlineCodeRun: InlineCodeRun | null): number {
  if (inlineCodeRun !== null) {
    return inlineCodeRun.endOffset;
  }

  throw new RangeError("Inline code run end offset is unavailable.");
}

function createInlineCodeRun(segmentText: string, startOffset: number): InlineCodeRun {
  let endOffset = startOffset;

  while (segmentText[endOffset] === "`") {
    endOffset += 1;
  }

  return {
    startOffset,
    endOffset,
    markerLength: endOffset - startOffset,
  };
}
