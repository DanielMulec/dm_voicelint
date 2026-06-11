import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { checkRepositoryFileLines } from "../../src/tooling/fileLineCheck.js";

const temporaryDirectoryPaths: string[] = [];

describe("checkRepositoryFileLines", () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectoryPaths.splice(0).map((directoryPath) =>
        rm(directoryPath, { recursive: true, force: true }),
      ),
    );
  });

  it("reports files above the configured line limit", async () => {
    const rootDirectoryPath = await createRepositoryFixture();
    await writeTrackedFile(
      rootDirectoryPath,
      "src/oversized.ts",
      createRepeatedLines("export const value = 1;", 401),
    );

    const result = await checkRepositoryFileLines({
      rootDirectoryPath,
      directoryNames: ["src", "test", "scripts"],
      maxLineCount: 400,
    });

    expect(result.checkedFileCount).toBe(1);
    expect(result.failures).toEqual([
      {
        filePath: "src/oversized.ts",
        lineCount: 401,
      },
    ]);
  });

  it("ignores generated files even when they exceed the limit", async () => {
    const rootDirectoryPath = await createRepositoryFixture();
    await writeTrackedFile(
      rootDirectoryPath,
      "scripts/generated.mjs",
      createGeneratedFile(450),
    );

    const result = await checkRepositoryFileLines({
      rootDirectoryPath,
      directoryNames: ["src", "test", "scripts"],
      maxLineCount: 400,
    });

    expect(result.checkedFileCount).toBe(1);
    expect(result.failures).toEqual([]);
  });
});

const createRepositoryFixture = async (): Promise<string> => {
  const rootDirectoryPath = await mkdtemp(join(tmpdir(), "voicelint-lines-"));
  temporaryDirectoryPaths.push(rootDirectoryPath);

  await Promise.all([
    mkdir(join(rootDirectoryPath, "src"), { recursive: true }),
    mkdir(join(rootDirectoryPath, "test"), { recursive: true }),
    mkdir(join(rootDirectoryPath, "scripts"), { recursive: true }),
  ]);

  return rootDirectoryPath;
};

const writeTrackedFile = async (
  rootDirectoryPath: string,
  relativeFilePath: string,
  fileContent: string,
): Promise<void> => {
  await writeFile(join(rootDirectoryPath, relativeFilePath), fileContent, "utf8");
};

const createRepeatedLines = (lineText: string, lineCount: number): string =>
  `${Array.from({ length: lineCount }, () => lineText).join("\n")}\n`;

const createGeneratedFile = (lineCount: number): string =>
  createRepeatedLines("// @generated", 1) + createRepeatedLines("export {};", lineCount - 1);
