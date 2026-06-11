import { PassThrough, Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { runCli } from "../../src/cli/main.js";

class BufferStream extends Writable {
  public text = "";

  public override _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.text += chunk.toString();
    callback();
  }
}

describe("runCli", () => {
  it("prints the compiled help text for --help", async () => {
    const input = new PassThrough();
    const output = new BufferStream();
    const errorOutput = new BufferStream();

    const exitCode = await runCli(["--help"], input, output, errorOutput);

    expect(exitCode).toBe(0);
    expect(output.text).toContain("VoiceLint");
    expect(output.text).toContain("This package now builds from TypeScript.");
    expect(output.text).toContain("voicelint init");
    expect(errorOutput.text).toBe("");
  });
});
