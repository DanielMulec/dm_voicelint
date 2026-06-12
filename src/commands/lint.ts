import { extname } from "node:path";

import type { ParsedLintCommand } from "../cli/args.js";
import { exitCodes } from "../cli/exit-code.js";
import {
  loadVoiceLintConfig,
  type LoadedVoiceLintConfig,
} from "../config/load-config.js";
import { discoverInputSources, type DiscoveredInputSources } from "../input/input-mode.js";
import type { TextSource } from "../input/read-source.js";
import { createMarkdownSegments } from "../segments/markdown-segments.js";
import { createPlainTextSegments } from "../segments/plain-text-segments.js";
import { ok, type CommandResult } from "../shared/result.js";

export async function executeLintCommand(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
): Promise<CommandResult> {
  const loadedConfigResult = await loadVoiceLintConfig(command.configPath);
  if (!loadedConfigResult.ok) {
    return loadedConfigResult;
  }

  const discoveredSourcesResult = await discoverInputSources(
    command,
    input,
    createDiscoveryOptions(loadedConfigResult.value),
  );
  return discoveredSourcesResult.ok
    ? ok({
        exitCode: exitCodes.failure,
        stderrText: createLintShellText(
          command,
          discoveredSourcesResult.value,
          loadedConfigResult.value,
        ),
      })
    : discoveredSourcesResult;
}

function createDiscoveryOptions(
  loadedConfig: LoadedVoiceLintConfig,
): Parameters<typeof discoverInputSources>[2] {
  return {
    includeGlobs: loadedConfig.include,
    excludeGlobs: loadedConfig.exclude,
  };
}

function createLintShellText(
  command: ParsedLintCommand,
  discoveredInputSources: DiscoveredInputSources,
  loadedConfig: LoadedVoiceLintConfig,
): string {
  const segmentCount = countSegments(discoveredInputSources.sources);
  return [
    "VoiceLint input discovery completed.",
    `Profile: ${loadedConfig.profile}`,
    `Config path: ${loadedConfig.configFilePath}`,
    `Input mode: ${discoveredInputSources.inputMode}`,
    `Output format: ${command.format}`,
    `Source count: ${discoveredInputSources.sources.length}`,
    `Segment count: ${segmentCount}`,
    ...createSourcePathLines(discoveredInputSources),
    "Implementation pending.",
    "",
  ].join("\n");
}

function createSourcePathLines(
  discoveredInputSources: DiscoveredInputSources,
): readonly string[] {
  return discoveredInputSources.sources.map((source) => `- ${source.path}`);
}

function countSegments(sources: readonly TextSource[]): number {
  return sources.reduce((segmentCount, source) => segmentCount + readSegments(source).length, 0);
}

function readSegments(source: TextSource) {
  return isMarkdownSource(source.path)
    ? createMarkdownSegments(source.content)
    : createPlainTextSegments(source.content);
}

function isMarkdownSource(sourcePath: string): boolean {
  const fileExtension = extname(sourcePath).toLowerCase();
  return fileExtension === ".md" || fileExtension === ".mdx";
}
