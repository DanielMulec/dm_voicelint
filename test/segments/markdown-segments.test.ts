import { describe, expect, it } from "vitest";

import { createMarkdownSegments } from "../../src/segments/markdown-segments.js";

describe("createMarkdownSegments", () => {
  it("creates heading, paragraph, and list-item segments with exact locations", () => {
    const sourceText = [
      "# Heading",
      "",
      "Paragraph text",
      "- Item",
    ].join("\n");

    const segments = createMarkdownSegments(sourceText);

    expect(segments).toMatchObject([
      {
        kind: "heading",
        text: "Heading",
        range: {
          line: 1,
          column: 3,
          endLine: 1,
          endColumn: 10,
        },
      },
      {
        kind: "paragraph",
        text: "Paragraph text",
        range: {
          line: 3,
          column: 1,
          endLine: 3,
          endColumn: 15,
        },
      },
      {
        kind: "list_item",
        text: "Item",
        range: {
          line: 4,
          column: 3,
          endLine: 4,
          endColumn: 7,
        },
      },
    ]);
  });

  it("skips fenced code blocks", () => {
    const sourceText = [
      "Before paragraph",
      "",
      "```ts",
      "const ignored = true;",
      "```",
      "",
      "After paragraph",
    ].join("\n");

    const segments = createMarkdownSegments(sourceText);

    expect(segments).toMatchObject([
      { kind: "paragraph", text: "Before paragraph" },
      { kind: "paragraph", text: "After paragraph" },
    ]);
    expect(segments).toHaveLength(2);
  });

  it("marks inline code spans as excluded from literal checks", () => {
    const [segment] = createMarkdownSegments("Use `code` now.");

    expect(segment).toMatchObject({
      kind: "paragraph",
      text: "Use `code` now.",
      literalExclusionRanges: [
        {
          line: 1,
          column: 5,
          endLine: 1,
          endColumn: 11,
        },
      ],
    });
  });

  it("returns no segments for an empty file", () => {
    expect(createMarkdownSegments("")).toEqual([]);
  });
});
