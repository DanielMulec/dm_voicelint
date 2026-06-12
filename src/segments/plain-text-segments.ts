import { createLineIndex, type IndexedLine } from "../locations/line-index.js";
import type { OffsetRange } from "../locations/range.js";
import { createTextSegment, type TextSegment } from "./segment.js";

const blankLinePattern = /^\s*$/u;

export function createPlainTextSegments(sourceText: string): readonly TextSegment[] {
  const lineIndex = createLineIndex(sourceText);
  return sortSegments([
    ...createLineSegments(sourceText, lineIndex.lines, lineIndex),
    ...createParagraphSegments(sourceText, lineIndex.lines, lineIndex),
  ]);
}

function createLineSegments(
  sourceText: string,
  indexedLines: readonly IndexedLine[],
  lineIndex: ReturnType<typeof createLineIndex>,
): readonly TextSegment[] {
  return indexedLines
    .filter((indexedLine) => !isBlankLine(indexedLine))
    .map((indexedLine) =>
      createTextSegment(
        "line",
        sourceText,
        lineIndex,
        createLineRange(indexedLine),
      )
    );
}

function createParagraphSegments(
  sourceText: string,
  indexedLines: readonly IndexedLine[],
  lineIndex: ReturnType<typeof createLineIndex>,
): readonly TextSegment[] {
  const paragraphRanges: OffsetRange[] = [];
  let lineIndexOffset = 0;

  while (lineIndexOffset < indexedLines.length) {
    const nextParagraphRange = readNextParagraphRange(indexedLines, lineIndexOffset);
    lineIndexOffset = nextParagraphRange.nextLineIndex;
    if (nextParagraphRange.range !== null) {
      paragraphRanges.push(nextParagraphRange.range);
    }
  }

  return paragraphRanges.map((paragraphRange) =>
    createTextSegment("paragraph", sourceText, lineIndex, paragraphRange)
  );
}

function readNextParagraphRange(
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
): { readonly nextLineIndex: number; readonly range: OffsetRange | null } {
  return isBlankLine(readIndexedLine(indexedLines, startLineIndex))
    ? { nextLineIndex: startLineIndex + 1, range: null }
    : createParagraphRange(indexedLines, startLineIndex);
}

function createParagraphRange(
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
): { readonly nextLineIndex: number; readonly range: OffsetRange } {
  const endLineIndex = readParagraphEndLineIndex(indexedLines, startLineIndex + 1);
  const firstParagraphLine = readIndexedLine(indexedLines, startLineIndex);
  const lastParagraphLine = readIndexedLine(indexedLines, endLineIndex - 1);

  return {
    nextLineIndex: endLineIndex,
    range: {
      startOffset: firstParagraphLine.startOffset,
      endOffset: lastParagraphLine.contentEndOffset,
    },
  };
}

function readParagraphEndLineIndex(
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
): number {
  let nextLineIndex = startLineIndex;

  while (nextLineIndex < indexedLines.length && !isBlankLine(indexedLines[nextLineIndex])) {
    nextLineIndex += 1;
  }

  return nextLineIndex;
}

function createLineRange(indexedLine: IndexedLine): OffsetRange {
  return {
    startOffset: indexedLine.startOffset,
    endOffset: indexedLine.contentEndOffset,
  };
}

function isBlankLine(indexedLine: IndexedLine | undefined): boolean {
  return indexedLine === undefined || blankLinePattern.test(indexedLine.content);
}

function readIndexedLine(
  indexedLines: readonly IndexedLine[],
  lineIndex: number,
): IndexedLine {
  const indexedLine = indexedLines[lineIndex];
  if (indexedLine !== undefined) {
    return indexedLine;
  }

  throw new RangeError(`Missing plain-text line at index ${lineIndex}.`);
}

function sortSegments(segments: readonly TextSegment[]): readonly TextSegment[] {
  return [...segments].sort(compareSegments);
}

function compareSegments(left: TextSegment, right: TextSegment): number {
  return left.range.startOffset - right.range.startOffset
    || left.range.endOffset - right.range.endOffset
    || left.kind.localeCompare(right.kind);
}
