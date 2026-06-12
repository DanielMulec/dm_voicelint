import { describe, expect, it } from "vitest";

import { mergeVoiceLintCodexHooks } from "../../src/agents/codex/codex-hook-merge.js";

describe("mergeVoiceLintCodexHooks", () => {
  it("creates the VoiceLint hook events in an empty config", () => {
    const result = mergeVoiceLintCodexHooks({});

    expect(result.ok).toBe(true);
    expect(result.ok ? result.changed : false).toBe(true);
    expect(result.ok ? result.config : {}).toEqual({
      hooks: {
        PostToolUse: [
          {
            matcher: "apply_patch|Edit|Write",
            hooks: [
              {
                type: "command",
                command: 'node "$(git rev-parse --show-toplevel)/.codex/voicelint-post-tool-use-hook.mjs"',
                statusMessage: "Running VoiceLint",
                timeout: 60,
              },
            ],
          },
        ],
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command: 'node "$(git rev-parse --show-toplevel)/.codex/voicelint-stop-hook.mjs"',
                statusMessage: "Checking VoiceLint before stopping",
                timeout: 60,
              },
            ],
          },
        ],
      },
    });
  });

  it("preserves unrelated events, matcher groups, and command handlers", () => {
    const existingConfig = {
      hooks: {
        UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo prompt" }] }],
        PostToolUse: [
          {
            matcher: "Read",
            hooks: [{ type: "command", command: "echo read" }],
          },
          {
            matcher: "apply_patch|Edit|Write",
            hooks: [{ type: "command", command: "echo edit" }],
          },
        ],
        Stop: [
          {
            hooks: [{ type: "command", command: "echo stop" }],
          },
        ],
      },
    };

    const result = mergeVoiceLintCodexHooks(existingConfig);

    expect(result.ok ? result.config.hooks : {}).toMatchObject({
      UserPromptSubmit: [{ hooks: [{ type: "command", command: "echo prompt" }] }],
      PostToolUse: [
        {
          matcher: "Read",
          hooks: [{ type: "command", command: "echo read" }],
        },
        {
          matcher: "apply_patch|Edit|Write",
          hooks: [
            { type: "command", command: "echo edit" },
            {
              type: "command",
              command: 'node "$(git rev-parse --show-toplevel)/.codex/voicelint-post-tool-use-hook.mjs"',
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            { type: "command", command: "echo stop" },
            {
              type: "command",
              command: 'node "$(git rev-parse --show-toplevel)/.codex/voicelint-stop-hook.mjs"',
            },
          ],
        },
      ],
    });
  });

  it("adds missing PostToolUse and Stop handlers without duplicating repeated init", () => {
    const firstMerge = mergeVoiceLintCodexHooks({});
    const firstConfig = readMergedConfig(firstMerge);
    const secondMerge = mergeVoiceLintCodexHooks(firstConfig);

    expect(secondMerge.ok ? secondMerge.changed : true).toBe(false);
    expect(secondMerge.ok ? secondMerge.config : {}).toEqual(firstConfig);
  });

  it("rejects unsafe existing hook shapes", () => {
    const result = mergeVoiceLintCodexHooks({ hooks: { Stop: "run" } });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toContain("hooks.Stop");
  });
});

function readMergedConfig(result: ReturnType<typeof mergeVoiceLintCodexHooks>): object {
  expect(result.ok).toBe(true);
  return result.ok ? result.config : {};
}
