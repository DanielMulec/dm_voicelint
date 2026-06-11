import type { ParsedLintCommand } from "../cli/args.js";
import { exitCodes } from "../cli/exit-code.js";
import { discoverInputSources, type DiscoveredInputSources } from "../input/input-mode.js";
import { ok, type CommandResult } from "../shared/result.js";

export async function executeLintCommand(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
): Promise<CommandResult> {
  const discoveredSourcesResult = await discoverInputSources(command, input);
  return discoveredSourcesResult.ok
    ? ok({
        exitCode: exitCodes.failure,
        stderrText: createLintShellText(command, discoveredSourcesResult.value),
      })
    : discoveredSourcesResult;
}

function createLintShellText(
  command: ParsedLintCommand,
  discoveredInputSources: DiscoveredInputSources,
): string {
  return [
    "VoiceLint input discovery completed.",
    `Input mode: ${discoveredInputSources.inputMode}`,
    `Output format: ${command.format}`,
    `Source count: ${discoveredInputSources.sources.length}`,
    ...createSourcePathLines(discoveredInputSources),
    ...createConfigPathLines(command.configPath),
    "Implementation pending.",
    "",
  ].join("\n");
}

function createSourcePathLines(
  discoveredInputSources: DiscoveredInputSources,
): readonly string[] {
  return discoveredInputSources.sources.map((source) => `- ${source.path}`);
}

function createConfigPathLines(configPath: string | undefined): readonly string[] {
  return typeof configPath === "string" ? [`Config path: ${configPath}`] : [];
}
