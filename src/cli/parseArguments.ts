export type ParsedCliArguments =
  | { mode: "help" }
  | { mode: "version" }
  | { mode: "run"; tokens: readonly string[] };

const helpFlags = new Set(["--help", "-h"]);
const versionFlags = new Set(["--version", "-v"]);

export const parseCliArguments = (args: readonly string[]): ParsedCliArguments => {
  if (isSingleHelpFlag(args)) {
    return { mode: "help" };
  }

  if (isSingleVersionFlag(args)) {
    return { mode: "version" };
  }

  return { mode: "run", tokens: args };
};

const isSingleHelpFlag = (args: readonly string[]): boolean =>
  args.length === 1 && typeof args[0] === "string" && helpFlags.has(args[0]);

const isSingleVersionFlag = (args: readonly string[]): boolean =>
  args.length === 1 &&
  typeof args[0] === "string" &&
  versionFlags.has(args[0]);
