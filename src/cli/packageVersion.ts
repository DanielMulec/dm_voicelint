import { readFile } from "node:fs/promises";

import { z } from "zod";

const packageManifestSchema = z.object({
  version: z.string().min(1),
});

const packageManifestUrl = new URL("../../package.json", import.meta.url);

export async function readPackageVersion(): Promise<string> {
  const packageManifestText = await readFile(packageManifestUrl, "utf8");
  const packageManifestValue: unknown = JSON.parse(packageManifestText);
  return packageManifestSchema.parse(packageManifestValue).version;
}
