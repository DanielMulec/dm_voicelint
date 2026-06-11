import { describe, expect, it } from "vitest";

import { parseCliArguments } from "../../src/cli/args.js";

describe("parseCliArguments", () => {
  it("recognizes changed and staged as diff input modes", () => {
    const changedCommand = parseCliArguments(["changed"]);
    const stagedCommand = parseCliArguments(["staged"]);

    expect(changedCommand).toMatchObject({
      ok: true,
      value: {
        commandName: "lint",
        requestedInputMode: "changed",
      },
    });
    expect(stagedCommand).toMatchObject({
      ok: true,
      value: {
        commandName: "lint",
        requestedInputMode: "staged",
      },
    });
  });

  it("recognizes path arguments as file input mode", () => {
    const parsedCommand = parseCliArguments([".", "--format", "json"]);

    expect(parsedCommand).toMatchObject({
      ok: true,
      value: {
        commandName: "lint",
        requestedInputMode: "paths",
        pathArgs: ["."],
        format: "json",
      },
    });
  });

  it("recognizes explicit stdin mode and the provided stdin file path", () => {
    const parsedCommand = parseCliArguments([
      "--stdin",
      "--stdin-file-path",
      "docs/example.md",
    ]);

    expect(parsedCommand).toMatchObject({
      ok: true,
      value: {
        commandName: "lint",
        requestedInputMode: "stdin",
        stdinFilePath: "docs/example.md",
      },
    });
  });
});
