import type { LineIndex } from "../locations/line-index.js";
import {
  createSourceRange,
  type OffsetRange,
  type SourceRange,
} from "../locations/range.js";

export type SegmentKind = "heading" | "paragraph" | "list_item" | "line";

export interface TextSegment {
  readonly kind: SegmentKind;
  readonly text: string;
  readonly range: SourceRange;
  readonly literalExclusionRanges: readonly SourceRange[];
}

export function createTextSegment(
  kind: SegmentKind,
  sourceText: string,
  lineIndex: LineIndex,
  segmentRange: OffsetRange,
  literalExclusionRanges: readonly OffsetRange[] = [],
): TextSegment {
  return {
    kind,
    text: sourceText.slice(segmentRange.startOffset, segmentRange.endOffset),
    range: createSourceRange(lineIndex, segmentRange),
    literalExclusionRanges: literalExclusionRanges.map((offsetRange) =>
      createSourceRange(lineIndex, offsetRange)
    ),
  };
}
