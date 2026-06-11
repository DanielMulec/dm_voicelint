import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { readStandardInputSource } from "../../src/input/stdin.js";

describe("readStandardInputSource", () => {
  it("reads stdin content and preserves the provided virtual path", async () => {
    const input = createFinishedInput("hello from stdin\n");

    const sourceResult = await readStandardInputSource(input, "docs/example.md");

    expect(sourceResult).toMatchObject({
      ok: true,
      value: {
        path: "docs/example.md",
        content: "hello from stdin\n",
      },
    });
  });

  it("defaults the stdin path to <stdin>", async () => {
    const input = createFinishedInput("hello\n");

    const sourceResult = await readStandardInputSource(input, undefined);

    expect(sourceResult).toMatchObject({
      ok: true,
      value: {
        path: "<stdin>",
        content: "hello\n",
      },
    });
  });
});

function createFinishedInput(content: string): PassThrough {
  const input = new PassThrough();
  input.end(content);
  return input;
}
