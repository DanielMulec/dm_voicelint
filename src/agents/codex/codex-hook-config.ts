import type { JsonObject } from "./codex-hook-schema.js";

export const codexHookFiles = {
  hooksConfig: ".codex/hooks.json",
  postToolUseScript: ".codex/voicelint-post-tool-use-hook.mjs",
  stopScript: ".codex/voicelint-stop-hook.mjs",
} as const;

export const voiceLintPostToolUseCommand =
  'node "$(git rev-parse --show-toplevel)/.codex/voicelint-post-tool-use-hook.mjs"';
export const voiceLintStopCommand =
  'node "$(git rev-parse --show-toplevel)/.codex/voicelint-stop-hook.mjs"';

export const voiceLintPostToolUseMatcher = "apply_patch|Edit|Write";

export function createVoiceLintCommandHook(command: string): JsonObject {
  return {
    type: "command",
    command,
    statusMessage: readStatusMessage(command),
    timeout: 60,
  };
}

function readStatusMessage(command: string): string {
  return command === voiceLintPostToolUseCommand
    ? "Running VoiceLint"
    : "Checking VoiceLint before stopping";
}
