import type { ParsedLintCommand } from "../cli/args.js";
import { exitCodes } from "../cli/exit-code.js";
import {
  loadVoiceLintConfig,
  type LoadedVoiceLintConfig,
} from "../config/load-config.js";
import { discoverInputSources, type DiscoveredInputSources } from "../input/input-mode.js";
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
  return [
    "VoiceLint input discovery completed.",
    `Profile: ${loadedConfig.profile}`,
    `Config path: ${loadedConfig.configFilePath}`,
    `Input mode: ${discoveredInputSources.inputMode}`,
    `Output format: ${command.format}`,
    `Source count: ${discoveredInputSources.sources.length}`,
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
