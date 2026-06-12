import { createLineIndex, type IndexedLine } from "../locations/line-index.js";
import type { OffsetRange } from "../locations/range.js";
import { collectInlineCodeRanges } from "./inline-code-ranges.js";
import { createTextSegment, type SegmentKind, type TextSegment } from "./segment.js";

const atxHeadingPattern = /^(\s{0,3}#{1,6}[ \t]+)(.*?)(?:[ \t]+#+[ \t]*)?$/u;
const listItemPattern = /^(\s{0,3}(?:[-+*]|\d+[.)])[ \t]+)(.*)$/u;
const fencePattern = /^\s{0,3}(```+|~~~+).*$/u;
const blankLinePattern = /^\s*$/u;

interface MarkdownBlockResult {
  readonly nextLineIndex: number;
  readonly segment: TextSegment | null;
}

interface FenceStart {
  readonly marker: "`" | "~";
  readonly markerLength: number;
}

export function createMarkdownSegments(sourceText: string): readonly TextSegment[] {
  const lineIndex = createLineIndex(sourceText);
  const segments: TextSegment[] = [];
  let nextLineIndex = 0;

  while (nextLineIndex < lineIndex.lines.length) {
    const blockResult = readMarkdownBlock(sourceText, lineIndex.lines, nextLineIndex, lineIndex);
    nextLineIndex = blockResult.nextLineIndex;
    if (blockResult.segment !== null) {
      segments.push(blockResult.segment);
    }
  }

  return segments;
}

function readMarkdownBlock(
  sourceText: string,
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
  lineIndex: ReturnType<typeof createLineIndex>,
): MarkdownBlockResult {
  const indexedLine = readIndexedLine(indexedLines, startLineIndex);
  return isBlankLine(indexedLine)
    ? { nextLineIndex: startLineIndex + 1, segment: null }
    : readMarkdownContentBlock(sourceText, indexedLines, startLineIndex, lineIndex, indexedLine);
}

function readMarkdownContentBlock(
  sourceText: string,
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
  lineIndex: ReturnType<typeof createLineIndex>,
  indexedLine: IndexedLine,
): MarkdownBlockResult {
  const fenceStart = readFenceStart(indexedLine.content);
  if (fenceStart !== null) {
    return {
      nextLineIndex: readFenceEndLineIndex(indexedLines, startLineIndex + 1, fenceStart),
      segment: null,
    };
  }

  return createMarkdownTextSegment(sourceText, indexedLines, startLineIndex, lineIndex, indexedLine);
}

function createMarkdownTextSegment(
  sourceText: string,
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
  lineIndex: ReturnType<typeof createLineIndex>,
  indexedLine: IndexedLine,
): MarkdownBlockResult {
  const headingRange = readHeadingRange(indexedLine);
  if (headingRange !== null) {
    return {
      nextLineIndex: startLineIndex + 1,
      segment: createLiteralAwareSegment("heading", sourceText, lineIndex, headingRange),
    };
  }

  const listItemRange = readListItemRange(indexedLines, startLineIndex);
  return listItemRange === null
    ? createParagraphSegment(sourceText, indexedLines, startLineIndex, lineIndex)
    : {
        nextLineIndex: listItemRange.nextLineIndex,
        segment: createLiteralAwareSegment("list_item", sourceText, lineIndex, listItemRange.range),
      };
}

function readFenceStart(content: string): FenceStart | null {
  const fenceMatch = content.match(fencePattern);
  if (fenceMatch === null) {
    return null;
  }

  return createFenceStart(readRequiredCaptureGroup(fenceMatch, 1));
}

function createFenceStart(fenceText: string): FenceStart {
  return {
    marker: fenceText.startsWith("`") ? "`" : "~",
    markerLength: fenceText.length,
  };
}

function readFenceEndLineIndex(
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
  fenceStart: FenceStart,
): number {
  let nextLineIndex = startLineIndex;

  while (nextLineIndex < indexedLines.length) {
    if (isFenceClose(readIndexedLine(indexedLines, nextLineIndex).content, fenceStart)) {
      return nextLineIndex + 1;
    }

    nextLineIndex += 1;
  }

  return indexedLines.length;
}

function isFenceClose(content: string, fenceStart: FenceStart): boolean {
  return createFenceClosePattern(fenceStart).test(content);
}

function createFenceClosePattern(fenceStart: FenceStart): RegExp {
  return new RegExp(`^\\s{0,3}${fenceStart.marker}{${fenceStart.markerLength},}\\s*$`, "u");
}

function readHeadingRange(indexedLine: IndexedLine): OffsetRange | null {
  const headingMatch = indexedLine.content.match(atxHeadingPattern);
  if (headingMatch === null) {
    return null;
  }

  const prefixText = readRequiredCaptureGroup(headingMatch, 1);
  const headingText = readRequiredCaptureGroup(headingMatch, 2);
  return {
    startOffset: indexedLine.startOffset + prefixText.length,
    endOffset: indexedLine.startOffset + prefixText.length + headingText.length,
  };
}

function readListItemRange(
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
): { readonly nextLineIndex: number; readonly range: OffsetRange } | null {
  const listItemStartRange = readListItemStartRange(readIndexedLine(indexedLines, startLineIndex));
  if (listItemStartRange === null) {
    return null;
  }

  const nextLineIndex = readListItemEndLineIndex(indexedLines, startLineIndex + 1);
  const lastListItemLine = readIndexedLine(indexedLines, nextLineIndex - 1);
  return {
    nextLineIndex,
    range: {
      startOffset: listItemStartRange.startOffset,
      endOffset: lastListItemLine.contentEndOffset,
    },
  };
}

function readListItemStartRange(indexedLine: IndexedLine): OffsetRange | null {
  const listItemMatch = indexedLine.content.match(listItemPattern);
  if (listItemMatch === null) {
    return null;
  }

  const markerText = readRequiredCaptureGroup(listItemMatch, 1);
  return {
    startOffset: indexedLine.startOffset + markerText.length,
    endOffset: indexedLine.contentEndOffset,
  };
}

function readListItemEndLineIndex(
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
): number {
  let nextLineIndex = startLineIndex;

  while (nextLineIndex < indexedLines.length && !startsMarkdownBlock(indexedLines[nextLineIndex])) {
    nextLineIndex += 1;
  }

  return nextLineIndex;
}

function startsMarkdownBlock(indexedLine: IndexedLine | undefined): boolean {
  if (indexedLine === undefined) {
    return true;
  }

  if (blankLinePattern.test(indexedLine.content)) {
    return true;
  }

  return isStructuredMarkdownBlock(indexedLine);
}

function isStructuredMarkdownBlock(indexedLine: IndexedLine): boolean {
  return isFencedMarkdownLine(indexedLine)
    || isHeadingMarkdownLine(indexedLine)
    || isListItemMarkdownLine(indexedLine);
}

function isFencedMarkdownLine(indexedLine: IndexedLine): boolean {
  return readFenceStart(indexedLine.content) !== null;
}

function isHeadingMarkdownLine(indexedLine: IndexedLine): boolean {
  return readHeadingRange(indexedLine) !== null;
}

function isListItemMarkdownLine(indexedLine: IndexedLine): boolean {
  return readListItemStartRange(indexedLine) !== null;
}

function createParagraphSegment(
  sourceText: string,
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
  lineIndex: ReturnType<typeof createLineIndex>,
): MarkdownBlockResult {
  const nextLineIndex = readParagraphEndLineIndex(indexedLines, startLineIndex + 1);
  const firstParagraphLine = readIndexedLine(indexedLines, startLineIndex);
  const lastParagraphLine = readIndexedLine(indexedLines, nextLineIndex - 1);
  const paragraphRange = {
    startOffset: firstParagraphLine.startOffset,
    endOffset: lastParagraphLine.contentEndOffset,
  };

  return {
    nextLineIndex,
    segment: createLiteralAwareSegment("paragraph", sourceText, lineIndex, paragraphRange),
  };
}

function readParagraphEndLineIndex(
  indexedLines: readonly IndexedLine[],
  startLineIndex: number,
): number {
  let nextLineIndex = startLineIndex;

  while (nextLineIndex < indexedLines.length && !startsMarkdownBlock(indexedLines[nextLineIndex])) {
    nextLineIndex += 1;
  }

  return nextLineIndex;
}

function createLiteralAwareSegment(
  kind: SegmentKind,
  sourceText: string,
  lineIndex: ReturnType<typeof createLineIndex>,
  segmentRange: OffsetRange,
): TextSegment {
  return createTextSegment(
    kind,
    sourceText,
    lineIndex,
    segmentRange,
    collectInlineCodeRanges(sourceText, segmentRange),
  );
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

  throw new RangeError(`Missing Markdown line at index ${lineIndex}.`);
}

function readRequiredCaptureGroup(
  match: RegExpMatchArray,
  groupIndex: number,
): string {
  const capturedText = match[groupIndex];
  if (typeof capturedText === "string") {
    return capturedText;
  }

  throw new RangeError(`Missing regular-expression capture group ${groupIndex}.`);
}
