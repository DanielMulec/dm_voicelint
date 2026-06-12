import { describe, expect, it } from "vitest";

import { parseIgnoreComments } from "../../src/ignore/ignore-parser.js";

describe("parseIgnoreComments", () => {
  it("reports unmatched enable directives without treating them as active ignores", () => {
    const parsedIgnoreComments = parseIgnoreComments(
      [
        "<!-- voicelint-enable style.no-em-dash -->",
        "Before — after",
      ].join("\n"),
    );

    expect(parsedIgnoreComments.comments).toEqual([]);
    expect(parsedIgnoreComments.problems).toEqual([
      {
        kind: "unmatched-enable",
        line: 1,
        text: "<!-- voicelint-enable style.no-em-dash -->",
        message:
          "Unmatched VoiceLint enable comment for style.no-em-dash. No earlier disable block is active for that target.",
      },
    ]);
  });

  it("reports malformed directives without treating them as active ignores", () => {
    const parsedIgnoreComments = parseIgnoreComments(
      [
        "<!-- voicelint-disable -->",
        "Before — after",
      ].join("\n"),
    );

    expect(parsedIgnoreComments.comments).toEqual([]);
    expect(parsedIgnoreComments.problems).toEqual([
      {
        kind: "malformed",
        line: 1,
        text: "<!-- voicelint-disable -->",
        message:
          "Malformed VoiceLint ignore comment. Expected a full-line HTML comment with one directive and one rule id or all.",
      },
    ]);
  });
});
