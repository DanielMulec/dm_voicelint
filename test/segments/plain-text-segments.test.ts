import { describe, expect, it } from "vitest";

import { createPlainTextSegments } from "../../src/segments/plain-text-segments.js";

describe("createPlainTextSegments", () => {
  it("creates stable paragraph and line locations for CRLF text", () => {
    const sourceText = "Alpha\r\nBeta\r\n\r\nGamma";
    const segments = createPlainTextSegments(sourceText);
    const paragraphSegments = segments.filter((segment) => segment.kind === "paragraph");
    const lineSegments = segments.filter((segment) => segment.kind === "line");

    expect(paragraphSegments).toMatchObject([
      {
        text: "Alpha\r\nBeta",
        range: {
          line: 1,
          column: 1,
          endLine: 2,
          endColumn: 5,
        },
      },
      {
        text: "Gamma",
        range: {
          line: 4,
          column: 1,
          endLine: 4,
          endColumn: 6,
        },
      },
    ]);
    expect(lineSegments).toMatchObject([
      {
        text: "Alpha",
        range: {
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 6,
        },
      },
      {
        text: "Beta",
        range: {
          line: 2,
          column: 1,
          endLine: 2,
          endColumn: 5,
        },
      },
      {
        text: "Gamma",
        range: {
          line: 4,
          column: 1,
          endLine: 4,
          endColumn: 6,
        },
      },
    ]);
  });
});
