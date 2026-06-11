import type { InitCommand } from "../cli/args.js";
import { exitCodes } from "../cli/exit-code.js";
import { ok, type CommandResult } from "../shared/result.js";

export function executeInitCommand(command: InitCommand): CommandResult {
  return ok({
    exitCode: exitCodes.failure,
    stderrText: createInitShellText(command),
  });
}

function createInitShellText(command: InitCommand): string {
  const agentText = command.agent === null ? "none" : command.agent;
  return [
    "VoiceLint init command shell recognized.",
    `Agent setup: ${agentText}`,
    "Implementation pending.",
    "",
  ].join("\n");
}
