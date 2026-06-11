import { readFile } from "node:fs/promises";
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
  it("prints help output", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(["--help"]);

    expect(exitCode).toBe(0);
    expect(outputText).toContain("VoiceLint");
    expect(outputText).toContain("parses the v0.1 command shell");
    expect(outputText).toContain("voicelint --stdin");
    expect(errorText).toBe("");
  });

  it("prints the package version from package.json", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(["--version"]);
    const packageManifest = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8")) as {
      version: string;
    };

    expect(exitCode).toBe(0);
    expect(outputText).toBe(`${packageManifest.version}\n`);
    expect(errorText).toBe("");
  });

  it("exits 2 for an invalid reserved command path", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(["init", "deploy"]);

    expect(exitCode).toBe(2);
    expect(outputText).toBe("");
    expect(errorText).toContain("Unexpected argument for init: deploy");
  });

  it("exits 2 for an unknown format", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams([
      ".",
      "--format",
      "xml",
    ]);

    expect(exitCode).toBe(2);
    expect(outputText).toBe("");
    expect(errorText).toContain("Unknown format: xml");
  });

  it("exits 2 for an invalid flag", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(["--bogus"]);

    expect(exitCode).toBe(2);
    expect(outputText).toBe("");
    expect(errorText).toContain("Unknown flag: --bogus");
  });

  it("defines the default stdin content path for stdin mode", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(
      ["--stdin"],
      "stdin body\n",
    );

    expect(exitCode).toBe(2);
    expect(outputText).toBe("");
    expect(errorText).toContain("Input mode: stdin");
    expect(errorText).toContain("Source count: 1");
    expect(errorText).toContain("- <stdin>");
  });
});

const runCliWithStreams = async (
  args: readonly string[],
  inputText = "",
): Promise<{ exitCode: number; outputText: string; errorText: string }> => {
  const input = new PassThrough();
  input.end(inputText);
  const output = new BufferStream();
  const errorOutput = new BufferStream();

  const exitCode = await runCli(args, input, output, errorOutput);

  return {
    exitCode,
    outputText: output.text,
    errorText: errorOutput.text,
  };
};
