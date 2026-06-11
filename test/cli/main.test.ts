import { readFile } from "node:fs/promises";
import { PassThrough, Writable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { runCli } from "../../src/cli/main.js";
import {
  createTemporaryWorkspace,
  removeWorkspace,
  writeWorkspaceFile,
} from "../input/test-helpers.js";

const packageManifestSchema = z.object({
  version: z.string(),
});
const workspacePaths: string[] = [];

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
  afterEach(async () => {
    await Promise.all(workspacePaths.splice(0).map(removeWorkspace));
  });

  it("prints help output", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(["--help"]);

    expect(exitCode).toBe(0);
    expect(outputText).toContain("VoiceLint");
    expect(outputText).toContain("v0.0.5 provides the TypeScript CLI shell, repo-local config loading");
    expect(outputText).toContain(
      "voicelint --stdin [--stdin-file-path PATH] [--config PATH] [--format pretty|json|agent]",
    );
    expect(outputText).toContain("voicelint init [--agent codex]");
    expect(outputText).toContain("Supported input file types: .md, .mdx, .txt");
    expect(outputText).toContain("voicelint init");
    expect(outputText).not.toContain("parses the v0.1 command shell");
    expect(errorText).toBe("");
  });

  it("prints the package version from package.json", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(["--version"]);
    const packageManifest = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as unknown;
    const packageVersion = readPackageVersionFromValue(packageManifest);

    expect(exitCode).toBe(0);
    expect(packageVersion).not.toBeNull();
    expect(outputText).toBe(`${packageVersion}\n`);
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
    const workspacePath = await createWorkspace();
    const configPath = await writeBaselineConfig(workspacePath);
    const { exitCode, outputText, errorText } = await runCliWithStreams(
      ["--stdin", "--config", configPath],
      "stdin body\n",
    );

    expect(exitCode).toBe(2);
    expect(outputText).toBe("");
    expect(errorText).toContain("Profile: product");
    expect(errorText).toContain(`Config path: ${configPath}`);
    expect(errorText).toContain("Input mode: stdin");
    expect(errorText).toContain("Source count: 1");
    expect(errorText).toContain("- <stdin>");
  });

  it("returns a clear error when a lint command is missing config", async () => {
    const { exitCode, outputText, errorText } = await runCliWithStreams(
      ["--stdin"],
      "stdin body\n",
    );

    expect(exitCode).toBe(2);
    expect(outputText).toBe("");
    expect(errorText).toContain("VoiceLint config not found");
    expect(errorText).toContain("voicelint init");
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

const readPackageVersionFromValue = (value: unknown): string | null => {
  const parsedManifest = packageManifestSchema.safeParse(value);
  return parsedManifest.success ? parsedManifest.data.version : null;
};

async function createWorkspace(): Promise<string> {
  const workspacePath = await createTemporaryWorkspace("voicelint-cli-");
  workspacePaths.push(workspacePath);
  return workspacePath;
}

async function writeBaselineConfig(workspacePath: string): Promise<string> {
  const configPath = `${workspacePath}/voicelint.config.yml`;
  await writeWorkspaceFile(
    workspacePath,
    "voicelint.config.yml",
    [
      "profile: product",
      "",
      "rules:",
      "  style.no-em-dash: error",
      "  style.no-en-dash: warning",
      "  copy.avoid-generic-product-words: warning",
      "  product.preferred-terms: warning",
      "",
      "include:",
      '  - "**/*.md"',
      '  - "**/*.mdx"',
      '  - "**/*.txt"',
      "",
      "exclude:",
      '  - "node_modules/**"',
      '  - "dist/**"',
      '  - "coverage/**"',
      "",
    ].join("\n"),
  );
  return configPath;
}
