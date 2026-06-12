export interface IndexedLine {
  readonly lineNumber: number;
  readonly startOffset: number;
  readonly contentEndOffset: number;
  readonly endOffset: number;
  readonly content: string;
}

export interface LineIndex {
  readonly sourceText: string;
  readonly lines: readonly IndexedLine[];
}

export interface SourcePosition {
  readonly line: number;
  readonly column: number;
}

const lineBreakPattern = /\r\n|\n/gu;

export function createLineIndex(sourceText: string): LineIndex {
  return {
    sourceText,
    lines: collectIndexedLines(sourceText),
  };
}

export function locateOffset(lineIndex: LineIndex, offset: number): SourcePosition {
  validateOffset(lineIndex.sourceText, offset);
  const indexedLine = readContainingLine(lineIndex, offset);
  return {
    line: indexedLine.lineNumber,
    column: readColumnNumber(lineIndex.sourceText, indexedLine.startOffset, offset),
  };
}

function collectIndexedLines(sourceText: string): readonly IndexedLine[] {
  const indexedLines: IndexedLine[] = [];
  let lineStartOffset = 0;
  let lineNumber = 1;

  for (const lineBreakMatch of sourceText.matchAll(lineBreakPattern)) {
    const lineBreakStartOffset = readLineBreakStartOffset(lineBreakMatch);
    const lineEndOffset = lineBreakStartOffset + lineBreakMatch[0].length;
    indexedLines.push(
      createIndexedLine(
        sourceText,
        lineNumber,
        lineStartOffset,
        lineBreakStartOffset,
        lineEndOffset,
      ),
    );
    lineStartOffset = lineEndOffset;
    lineNumber += 1;
  }

  indexedLines.push(
    createIndexedLine(
      sourceText,
      lineNumber,
      lineStartOffset,
      sourceText.length,
      sourceText.length,
    ),
  );
  return indexedLines;
}

function createIndexedLine(
  sourceText: string,
  lineNumber: number,
  startOffset: number,
  contentEndOffset: number,
  endOffset: number,
): IndexedLine {
  return {
    lineNumber,
    startOffset,
    contentEndOffset,
    endOffset,
    content: sourceText.slice(startOffset, contentEndOffset),
  };
}

function readLineBreakStartOffset(lineBreakMatch: RegExpMatchArray): number {
  if (typeof lineBreakMatch.index === "number") {
    return lineBreakMatch.index;
  }

  throw new RangeError("Unable to determine the start offset of a line break.");
}

function validateOffset(sourceText: string, offset: number): void {
  if (offset < 0 || offset > sourceText.length) {
    throw new RangeError(`Offset ${offset} is outside the source text.`);
  }
}

function readContainingLine(lineIndex: LineIndex, offset: number): IndexedLine {
  const indexedLine = lineIndex.lines.find((line) => lineContainsOffset(line, offset, lineIndex.sourceText.length));
  if (indexedLine !== undefined) {
    return indexedLine;
  }

  throw new RangeError(`Offset ${offset} does not map to a source line.`);
}

function lineContainsOffset(
  indexedLine: IndexedLine,
  offset: number,
  sourceLength: number,
): boolean {
  return offset === sourceLength
    ? indexedLine.endOffset === sourceLength
    : indexedLine.startOffset <= offset && offset < indexedLine.endOffset;
}

function readColumnNumber(
  sourceText: string,
  lineStartOffset: number,
  offset: number,
): number {
  return countCodePoints(sourceText.slice(lineStartOffset, offset)) + 1;
}

function countCodePoints(value: string): number {
  return Array.from(value).length;
}
