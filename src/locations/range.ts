import type { LineIndex } from "./line-index.js";
import { locateOffset } from "./line-index.js";

export interface OffsetRange {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface SourceRange extends OffsetRange {
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export function createSourceRange(
  lineIndex: LineIndex,
  offsetRange: OffsetRange,
): SourceRange {
  validateOffsetRange(offsetRange);
  const startPosition = locateOffset(lineIndex, offsetRange.startOffset);
  const endPosition = locateOffset(lineIndex, offsetRange.endOffset);

  return {
    ...offsetRange,
    line: startPosition.line,
    column: startPosition.column,
    endLine: endPosition.line,
    endColumn: endPosition.column,
  };
}

function validateOffsetRange(offsetRange: OffsetRange): void {
  if (offsetRange.startOffset > offsetRange.endOffset) {
    throw new RangeError("Source ranges must not end before they start.");
  }
}
