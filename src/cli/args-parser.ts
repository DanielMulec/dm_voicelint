import { createInternalError, createUsageError } from "../shared/errors.js";
import { err, ok, type Result } from "../shared/result.js";
import type { OutputFormat } from "./args.js";

export interface StandardLintState {
  readonly explicitStdin: boolean;
  readonly format: OutputFormat;
  readonly pathArgs: readonly string[];
  readonly configPath?: string;
  readonly stdinFilePath?: string;
}

export interface DiffLintState {
  readonly format: OutputFormat;
  readonly configPath?: string;
}

export interface InitState {
  readonly agent: "codex" | null;
}

interface StateParseSuccess<TState> {
  readonly nextIndex: number;
  readonly nextState: TState;
}

interface ParsedOptionValue {
  readonly nextIndex: number;
  readonly optionValue: string;
}

interface ParsedOutputFormat {
  readonly nextIndex: number;
  readonly outputFormat: OutputFormat;
}

type StateParseResult<TState> = Result<StateParseSuccess<TState>, ReturnType<typeof createUsageError>>;
type StandardOptionParser = (
  tokens: readonly string[],
  index: number,
  state: StandardLintState,
) => StateParseResult<StandardLintState>;
type DiffOptionParser = (
  tokens: readonly string[],
  index: number,
  state: DiffLintState,
) => StateParseResult<DiffLintState>;
type InitOptionParser = (
  tokens: readonly string[],
  index: number,
  state: InitState,
) => StateParseResult<InitState>;

const supportedFormatValues = ["pretty", "json", "agent"] as const satisfies readonly OutputFormat[];
const supportedFormats = new Set<string>(supportedFormatValues);

export const defaultStandardLintState: StandardLintState = {
  explicitStdin: false,
  format: "pretty",
  pathArgs: [],
};

export const defaultDiffLintState: DiffLintState = {
  format: "pretty",
};

export const defaultInitState: InitState = {
  agent: null,
};

const standardOptionParsers: Record<string, StandardOptionParser> = {
  "--config": parseStandardConfigOption,
  "--format": parseStandardFormatOption,
  "--stdin": parseStandardStdinOption,
  "--stdin-file-path": parseStandardStdinFilePathOption,
  "--stdin-filepath": parseStandardStdinFilePathOption,
};

const diffOptionParsers: Record<string, DiffOptionParser> = {
  "--config": parseDiffConfigOption,
  "--format": parseDiffFormatOption,
};

const initOptionParsers: Record<string, InitOptionParser> = {
  "--agent": parseInitAgentOption,
};

export function consumeStandardTokens(
  tokens: readonly string[],
  index: number,
  state: StandardLintState,
): StateParseResult<StandardLintState> {
  if (index >= tokens.length) {
    return ok({ nextIndex: index, nextState: state });
  }

  return consumeDefinedStandardToken(tokens[index], tokens, index, state);
}

export function consumeDiffTokens(
  tokens: readonly string[],
  index: number,
  state: DiffLintState,
): StateParseResult<DiffLintState> {
  if (index >= tokens.length) {
    return ok({ nextIndex: index, nextState: state });
  }

  return consumeDefinedDiffToken(tokens[index], tokens, index, state);
}

export function consumeInitTokens(
  tokens: readonly string[],
  index: number,
  state: InitState,
): StateParseResult<InitState> {
  if (index >= tokens.length) {
    return ok({ nextIndex: index, nextState: state });
  }

  return consumeDefinedInitToken(tokens[index], tokens, index, state);
}

function consumeDefinedStandardToken(
  token: string | undefined,
  tokens: readonly string[],
  index: number,
  state: StandardLintState,
): StateParseResult<StandardLintState> {
  if (typeof token !== "string") {
    return err(createInternalError("Missing standard CLI token."));
  }

  const optionParser = standardOptionParsers[token];
  return optionParser === undefined
    ? consumeStandardPositionalToken(token, tokens, index, state)
    : continueStandardOptionParsing(optionParser(tokens, index, state), tokens);
}

function consumeStandardPositionalToken(
  token: string,
  tokens: readonly string[],
  index: number,
  state: StandardLintState,
): StateParseResult<StandardLintState> {
  if (isOptionToken(token)) {
    return err(createUsageError(`Unknown flag: ${token}`));
  }

  return consumeStandardTokens(tokens, index + 1, {
    ...state,
    pathArgs: [...state.pathArgs, token],
  });
}

function continueStandardOptionParsing(
  optionParseResult: StateParseResult<StandardLintState>,
  tokens: readonly string[],
): StateParseResult<StandardLintState> {
  if (!optionParseResult.ok) {
    return optionParseResult;
  }

  return consumeStandardTokens(
    tokens,
    optionParseResult.value.nextIndex,
    optionParseResult.value.nextState,
  );
}

function consumeDefinedDiffToken(
  token: string | undefined,
  tokens: readonly string[],
  index: number,
  state: DiffLintState,
): StateParseResult<DiffLintState> {
  if (typeof token !== "string") {
    return err(createInternalError("Missing diff CLI token."));
  }

  const optionParser = diffOptionParsers[token];
  return optionParser === undefined
    ? err(createUsageError(`Unexpected argument: ${token}`))
    : continueDiffOptionParsing(optionParser(tokens, index, state), tokens);
}

function continueDiffOptionParsing(
  optionParseResult: StateParseResult<DiffLintState>,
  tokens: readonly string[],
): StateParseResult<DiffLintState> {
  if (!optionParseResult.ok) {
    return optionParseResult;
  }

  return consumeDiffTokens(tokens, optionParseResult.value.nextIndex, optionParseResult.value.nextState);
}

function consumeDefinedInitToken(
  token: string | undefined,
  tokens: readonly string[],
  index: number,
  state: InitState,
): StateParseResult<InitState> {
  if (typeof token !== "string") {
    return err(createInternalError("Missing init CLI token."));
  }

  const optionParser = initOptionParsers[token];
  return optionParser === undefined
    ? err(createUsageError(`Unexpected argument for init: ${token}`))
    : continueInitOptionParsing(optionParser(tokens, index, state), tokens);
}

function continueInitOptionParsing(
  optionParseResult: StateParseResult<InitState>,
  tokens: readonly string[],
): StateParseResult<InitState> {
  if (!optionParseResult.ok) {
    return optionParseResult;
  }

  return consumeInitTokens(tokens, optionParseResult.value.nextIndex, optionParseResult.value.nextState);
}

function parseStandardConfigOption(
  tokens: readonly string[],
  index: number,
  state: StandardLintState,
): StateParseResult<StandardLintState> {
  const configPathResult = readRequiredOptionValue(tokens, index, "--config");
  return configPathResult.ok
    ? ok({
        nextIndex: configPathResult.value.nextIndex,
        nextState: {
          ...state,
          configPath: configPathResult.value.optionValue,
        },
      })
    : configPathResult;
}

function parseStandardFormatOption(
  tokens: readonly string[],
  index: number,
  state: StandardLintState,
): StateParseResult<StandardLintState> {
  const formatResult = readOutputFormat(tokens, index);
  return formatResult.ok
    ? ok({
        nextIndex: formatResult.value.nextIndex,
        nextState: {
          ...state,
          format: formatResult.value.outputFormat,
        },
      })
    : formatResult;
}

function parseStandardStdinOption(
  _tokens: readonly string[],
  index: number,
  state: StandardLintState,
): StateParseResult<StandardLintState> {
  return ok({
    nextIndex: index + 1,
    nextState: {
      ...state,
      explicitStdin: true,
    },
  });
}

function parseStandardStdinFilePathOption(
  tokens: readonly string[],
  index: number,
  state: StandardLintState,
): StateParseResult<StandardLintState> {
  const stdinFilePathResult = readRequiredOptionValue(tokens, index, "--stdin-file-path");
  return stdinFilePathResult.ok
    ? ok({
        nextIndex: stdinFilePathResult.value.nextIndex,
        nextState: {
          ...state,
          stdinFilePath: stdinFilePathResult.value.optionValue,
        },
      })
    : stdinFilePathResult;
}

function parseDiffConfigOption(
  tokens: readonly string[],
  index: number,
  state: DiffLintState,
): StateParseResult<DiffLintState> {
  const configPathResult = readRequiredOptionValue(tokens, index, "--config");
  return configPathResult.ok
    ? ok({
        nextIndex: configPathResult.value.nextIndex,
        nextState: {
          ...state,
          configPath: configPathResult.value.optionValue,
        },
      })
    : configPathResult;
}

function parseDiffFormatOption(
  tokens: readonly string[],
  index: number,
  state: DiffLintState,
): StateParseResult<DiffLintState> {
  const formatResult = readOutputFormat(tokens, index);
  return formatResult.ok
    ? ok({
        nextIndex: formatResult.value.nextIndex,
        nextState: {
          ...state,
          format: formatResult.value.outputFormat,
        },
      })
    : formatResult;
}

function parseInitAgentOption(
  tokens: readonly string[],
  index: number,
  state: InitState,
): StateParseResult<InitState> {
  const agentNameResult = readRequiredOptionValue(tokens, index, "--agent");
  if (!agentNameResult.ok) {
    return agentNameResult;
  }

  return agentNameResult.value.optionValue === "codex"
    ? ok({
        nextIndex: agentNameResult.value.nextIndex,
        nextState: {
          ...state,
          agent: "codex",
        },
      })
    : err(createUsageError(`Unsupported agent: ${agentNameResult.value.optionValue}`));
}

function readRequiredOptionValue(
  tokens: readonly string[],
  index: number,
  optionName: string,
): Result<ParsedOptionValue, ReturnType<typeof createUsageError>> {
  const optionValue = tokens[index + 1];
  return typeof optionValue === "string"
    ? ok({
        nextIndex: index + 2,
        optionValue,
      })
    : err(createUsageError(`Missing value for ${optionName}.`));
}

function readOutputFormat(
  tokens: readonly string[],
  index: number,
): Result<ParsedOutputFormat, ReturnType<typeof createUsageError>> {
  const formatTokenResult = readRequiredOptionValue(tokens, index, "--format");
  if (!formatTokenResult.ok) {
    return formatTokenResult;
  }

  return isOutputFormat(formatTokenResult.value.optionValue)
    ? ok({
        nextIndex: formatTokenResult.value.nextIndex,
        outputFormat: formatTokenResult.value.optionValue,
      })
    : err(createUsageError(`Unknown format: ${formatTokenResult.value.optionValue}`));
}

function isOutputFormat(formatToken: string): formatToken is OutputFormat {
  return supportedFormats.has(formatToken);
}

function isOptionToken(token: string): boolean {
  return token.startsWith("-");
}
