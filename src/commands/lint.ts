import type { ParsedLintCommand } from "../cli/args.js";
import type { AppError } from "../shared/errors.js";
import {
  loadVoiceLintConfig,
  type LoadedVoiceLintConfig,
} from "../config/load-config.js";
import { formatAgentDiagnostics } from "../output/agent-format.js";
import {
  formatJsonDiagnostics,
  formatJsonLintError,
} from "../output/json-format.js";
import { formatPrettyDiagnostics } from "../output/pretty-format.js";
import { createDiagnosticSummary } from "../output/summary.js";
import { discoverInputSources, type DiscoveredInputSources } from "../input/input-mode.js";
import { evaluateRules } from "../rules/evaluate-rules.js";
import { loadRules } from "../rules/load-rules.js";
import { createRuleIndex, resolveConfiguredRules } from "../rules/rule-index.js";
import { err, ok, type CommandResult, type Result } from "../shared/result.js";

export interface LintCommandOptions {
  readonly cwd?: string;
}

export async function executeLintCommand(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
  options: LintCommandOptions = {},
): Promise<CommandResult> {
  const preparedLintResult = await prepareLintExecution(command, input, options.cwd);
  return preparedLintResult.ok
    ? ok(
        createLintSuccessOutput(
          command.format,
          preparedLintResult.value.discoveredInputSources,
          preparedLintResult.value.loadedConfig,
          preparedLintResult.value.loadedRules,
        ),
      )
    : createFailureResult(command.format, preparedLintResult.error);
}

interface PreparedLintExecution {
  readonly discoveredInputSources: DiscoveredInputSources;
  readonly loadedConfig: LoadedVoiceLintConfig;
  readonly loadedRules: Parameters<typeof evaluateRules>[1];
}

async function prepareLintExecution(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
  cwd: string | undefined,
): Promise<Result<PreparedLintExecution, AppError>> {
  const loadedConfigResult = await loadVoiceLintConfig(
    command.configPath,
    createLoadConfigOptions(cwd),
  );
  return loadedConfigResult.ok
    ? prepareLintSources(command, input, cwd, loadedConfigResult.value)
    : loadedConfigResult;
}

async function prepareLintSources(
  command: ParsedLintCommand,
  input: NodeJS.ReadableStream,
  cwd: string | undefined,
  loadedConfig: LoadedVoiceLintConfig,
): Promise<Result<PreparedLintExecution, AppError>> {
  const discoveredSourcesResult = await discoverInputSources(
    command,
    input,
    createDiscoveryOptions(loadedConfig, cwd),
  );
  return discoveredSourcesResult.ok
    ? prepareLintRules(discoveredSourcesResult.value, loadedConfig)
    : discoveredSourcesResult;
}

async function prepareLintRules(
  discoveredInputSources: DiscoveredInputSources,
  loadedConfig: LoadedVoiceLintConfig,
): Promise<Result<PreparedLintExecution, AppError>> {
  const configuredRulesResult = await loadConfiguredRules(loadedConfig);
  return configuredRulesResult.ok
    ? ok({
        discoveredInputSources,
        loadedConfig,
        loadedRules: configuredRulesResult.value,
      })
    : configuredRulesResult;
}

async function loadConfiguredRules(
  loadedConfig: LoadedVoiceLintConfig,
): Promise<Result<PreparedLintExecution["loadedRules"], AppError>> {
  const loadedRulesResult = await loadRules(loadedConfig.configFilePath);
  return loadedRulesResult.ok
    ? resolveLoadedRules(loadedConfig, loadedRulesResult.value)
    : loadedRulesResult;
}

function resolveLoadedRules(
  loadedConfig: LoadedVoiceLintConfig,
  loadedRules: readonly NonNullable<PreparedLintExecution["loadedRules"]>[number][],
): Result<PreparedLintExecution["loadedRules"], AppError> {
  const ruleIndexResult = createRuleIndex(loadedRules);
  return ruleIndexResult.ok
    ? resolveConfiguredRules(
        ruleIndexResult.value,
        loadedConfig.configFilePath,
        loadedConfig.rules,
      )
    : ruleIndexResult;
}

function createLoadConfigOptions(cwd: string | undefined): Parameters<typeof loadVoiceLintConfig>[1] {
  return createOptionalCwd(cwd);
}

function createDiscoveryOptions(
  loadedConfig: LoadedVoiceLintConfig,
  cwd: string | undefined,
): Parameters<typeof discoverInputSources>[2] {
  return {
    ...createOptionalCwd(cwd),
    includeGlobs: loadedConfig.include,
    excludeGlobs: loadedConfig.exclude,
  };
}

function createLintSuccessOutput(
  format: ParsedLintCommand["format"],
  discoveredInputSources: DiscoveredInputSources,
  loadedConfig: LoadedVoiceLintConfig,
  loadedRules: Parameters<typeof evaluateRules>[1],
) {
  const diagnostics = evaluateRules(
    discoveredInputSources.sources,
    loadedRules,
    loadedConfig.profile,
  );
  const summary = createDiagnosticSummary(
    discoveredInputSources.sources.length,
    diagnostics,
  );

  return {
    exitCode: summary.exitCode,
    stdoutText: formatLintOutput(format, summary, diagnostics),
  };
}

function createFailureResult(
  format: ParsedLintCommand["format"],
  error: AppError,
): CommandResult {
  return format === "json"
    ? ok({
        exitCode: error.exitCode,
        stdoutText: formatJsonLintError(error.message),
      })
    : err(error);
}

function formatLintOutput(
  format: ParsedLintCommand["format"],
  summary: Parameters<typeof formatPrettyDiagnostics>[0],
  diagnostics: Parameters<typeof formatPrettyDiagnostics>[1],
): string {
  if (format === "json") {
    return formatJsonDiagnostics(summary, diagnostics);
  }

  return format === "agent"
    ? formatAgentDiagnostics(summary, diagnostics)
    : formatPrettyDiagnostics(summary, diagnostics);
}

function createOptionalCwd(
  cwd: string | undefined,
): { readonly cwd?: string } {
  return typeof cwd === "string" ? { cwd } : {};
}
