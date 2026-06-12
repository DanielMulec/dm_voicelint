import { describe, expect, it } from "vitest";

import { createLineIndex } from "../../src/locations/line-index.js";
import { createSourceRange } from "../../src/locations/range.js";

describe("createSourceRange", () => {
  it("counts Unicode code points instead of bytes for columns", () => {
    const lineIndex = createLineIndex("A😀B");

    const sourceRange = createSourceRange(lineIndex, {
      startOffset: 3,
      endOffset: 4,
    });

    expect(sourceRange).toMatchObject({
      line: 1,
      column: 3,
      endLine: 1,
      endColumn: 4,
    });
  });

  it("keeps the empty-file origin at line 1 column 1", () => {
    const lineIndex = createLineIndex("");

    const sourceRange = createSourceRange(lineIndex, {
      startOffset: 0,
      endOffset: 0,
    });

    expect(sourceRange).toMatchObject({
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 1,
    });
  });
});
