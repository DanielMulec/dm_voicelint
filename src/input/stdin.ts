import { createInternalError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import type { StandardInputSourceHandle } from "./read-source.js";

const defaultStandardInputPath = "<stdin>";

export function getDefaultStandardInputPath(): string {
  return defaultStandardInputPath;
}

export async function readStandardInputSource(
  input: NodeJS.ReadableStream,
  stdinFilePath: string | undefined,
): Promise<Result<StandardInputSourceHandle, ReturnType<typeof createInternalError>>> {
  const contentResult = await readStandardInputContent(input);
  return contentResult.ok
    ? ok({
        kind: "stdin",
        path: stdinFilePath ?? defaultStandardInputPath,
        content: contentResult.value,
      })
    : contentResult;
}

function readStandardInputContent(
  input: NodeJS.ReadableStream,
): Promise<Result<string, ReturnType<typeof createInternalError>>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];

    input.on("data", (chunk: string | Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    input.on("end", () => {
      resolve(ok(Buffer.concat(chunks).toString("utf8")));
    });

    input.on("error", (error: Error) => {
      resolve(err(createInternalError(`Unable to read stdin content: ${error.message}`)));
    });
  });
}
