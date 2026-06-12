import {
  createVoiceLintCommandHook,
  voiceLintPostToolUseCommand,
  voiceLintPostToolUseMatcher,
  voiceLintStopCommand,
} from "./codex-hook-config.js";
import {
  hasNonObjectProperty,
  isJsonObject,
  readJsonObjectProperty,
  type JsonArray,
  type JsonObject,
  type JsonValue,
} from "./codex-hook-schema.js";

export interface CodexHookMergeSuccess {
  readonly ok: true;
  readonly changed: boolean;
  readonly config: JsonObject;
}

export interface CodexHookMergeFailure {
  readonly ok: false;
  readonly message: string;
}

export type CodexHookMergeResult = CodexHookMergeSuccess | CodexHookMergeFailure;

export function mergeVoiceLintCodexHooks(existingConfig: unknown): CodexHookMergeResult {
  const rootConfigResult = readRootConfig(existingConfig);
  return rootConfigResult.ok
    ? mergeHookEvents(rootConfigResult.config, readJsonObjectProperty(rootConfigResult.config, "hooks") ?? {})
    : rootConfigResult;
}

interface RootConfigSuccess {
  readonly ok: true;
  readonly config: JsonObject;
}

function readRootConfig(existingConfig: unknown): RootConfigSuccess | CodexHookMergeFailure {
  if (!isJsonObject(existingConfig)) {
    return createInvalidMergeResult(".codex/hooks.json must contain a JSON object.");
  }

  if (hasNonObjectProperty(existingConfig, "hooks")) {
    return createInvalidMergeResult(".codex/hooks.json field `hooks` must be an object.");
  }

  return { ok: true, config: existingConfig };
}

function mergeHookEvents(rootConfig: JsonObject, hookEvents: JsonObject): CodexHookMergeResult {
  const postToolUseResult = mergePostToolUseEvent(hookEvents.PostToolUse);
  if (!postToolUseResult.ok) {
    return postToolUseResult;
  }

  const stopResult = mergeStopEvent(hookEvents.Stop);
  return stopResult.ok
    ? createMergedConfig(rootConfig, hookEvents, postToolUseResult, stopResult)
    : stopResult;
}

function createMergedConfig(
  rootConfig: JsonObject,
  hookEvents: JsonObject,
  postToolUseResult: EventMergeSuccess,
  stopResult: EventMergeSuccess,
): CodexHookMergeSuccess {
  const nextHookEvents = {
    ...hookEvents,
    PostToolUse: postToolUseResult.eventGroups,
    Stop: stopResult.eventGroups,
  };
  return {
    ok: true,
    changed: postToolUseResult.changed || stopResult.changed || hookEvents !== rootConfig.hooks,
    config: {
      ...rootConfig,
      hooks: nextHookEvents,
    },
  };
}

interface EventMergeSuccess {
  readonly ok: true;
  readonly changed: boolean;
  readonly eventGroups: JsonArray;
}

function mergePostToolUseEvent(eventValue: JsonValue | undefined): EventMergeSuccess | CodexHookMergeFailure {
  const eventGroupsResult = readEventGroups(eventValue, "PostToolUse");
  if (!eventGroupsResult.ok) {
    return eventGroupsResult;
  }

  return addVoiceLintHandlerToMatchedGroup(
    eventGroupsResult.eventGroups,
    voiceLintPostToolUseMatcher,
    voiceLintPostToolUseCommand,
  );
}

function mergeStopEvent(eventValue: JsonValue | undefined): EventMergeSuccess | CodexHookMergeFailure {
  const eventGroupsResult = readEventGroups(eventValue, "Stop");
  if (!eventGroupsResult.ok) {
    return eventGroupsResult;
  }

  return addVoiceLintHandlerToStopGroup(eventGroupsResult.eventGroups);
}

interface EventGroupsReadSuccess {
  readonly ok: true;
  readonly eventGroups: JsonArray;
}

function readEventGroups(
  eventValue: JsonValue | undefined,
  eventName: string,
): EventGroupsReadSuccess | CodexHookMergeFailure {
  if (eventValue === undefined) {
    return { ok: true, eventGroups: [] };
  }

  return Array.isArray(eventValue)
    ? { ok: true, eventGroups: eventValue }
    : createInvalidMergeResult(`.codex/hooks.json field hooks.${eventName} must be an array.`);
}

function addVoiceLintHandlerToMatchedGroup(
  eventGroups: JsonArray,
  matcher: string,
  command: string,
): EventMergeSuccess {
  const matchingGroupIndex = eventGroups.findIndex((eventGroup) => hasMatcherHooks(eventGroup, matcher));
  return matchingGroupIndex === -1
    ? createEventAppendResult(eventGroups, createMatchedEventGroup(matcher, command))
    : addVoiceLintHandlerToGroup(eventGroups, matchingGroupIndex, command);
}

function addVoiceLintHandlerToStopGroup(eventGroups: JsonArray): EventMergeSuccess {
  const stopGroupIndex = eventGroups.findIndex(isStopEventGroup);
  return stopGroupIndex === -1
    ? createEventAppendResult(eventGroups, createStopEventGroup())
    : addVoiceLintHandlerToGroup(eventGroups, stopGroupIndex, voiceLintStopCommand);
}

function addVoiceLintHandlerToGroup(
  eventGroups: JsonArray,
  eventGroupIndex: number,
  command: string,
): EventMergeSuccess {
  const eventGroup = eventGroups[eventGroupIndex];
  const hookGroup = readEventGroupWithHooks(eventGroup);
  return hookGroup === null
    ? createEventAppendResult(eventGroups, createCommandOnlyEventGroup(command))
    : mergeHandlerIntoExistingGroup(eventGroups, eventGroupIndex, hookGroup.eventGroup, hookGroup.hooks, command);
}

interface EventGroupWithHooks {
  readonly eventGroup: JsonObject;
  readonly hooks: JsonArray;
}

function readEventGroupWithHooks(eventGroup: JsonValue | undefined): EventGroupWithHooks | null {
  if (!isJsonObject(eventGroup)) {
    return null;
  }

  const hooks = eventGroup.hooks;
  return Array.isArray(hooks) ? { eventGroup, hooks } : null;
}

function mergeHandlerIntoExistingGroup(
  eventGroups: JsonArray,
  eventGroupIndex: number,
  eventGroup: JsonObject,
  hooks: JsonArray,
  command: string,
): EventMergeSuccess {
  return hasVoiceLintCommandHandler(hooks, command)
    ? { ok: true, changed: false, eventGroups }
    : replaceEventGroup(eventGroups, eventGroupIndex, {
        ...eventGroup,
        hooks: [...hooks, createVoiceLintCommandHook(command)],
      });
}

function createEventAppendResult(eventGroups: JsonArray, eventGroup: JsonObject): EventMergeSuccess {
  return {
    ok: true,
    changed: true,
    eventGroups: [...eventGroups, eventGroup],
  };
}

function replaceEventGroup(
  eventGroups: JsonArray,
  eventGroupIndex: number,
  eventGroup: JsonObject,
): EventMergeSuccess {
  return {
    ok: true,
    changed: true,
    eventGroups: eventGroups.map((existingGroup, index) =>
      index === eventGroupIndex ? eventGroup : existingGroup),
  };
}

function createMatchedEventGroup(matcher: string, command: string): JsonObject {
  return {
    matcher,
    hooks: [createVoiceLintCommandHook(command)],
  };
}

function createStopEventGroup(): JsonObject {
  return createCommandOnlyEventGroup(voiceLintStopCommand);
}

function createCommandOnlyEventGroup(command: string): JsonObject {
  return {
    hooks: [createVoiceLintCommandHook(command)],
  };
}

function hasMatcherHooks(eventGroup: JsonValue, matcher: string): boolean {
  return isJsonObject(eventGroup) && eventGroup.matcher === matcher && Array.isArray(eventGroup.hooks);
}

function isStopEventGroup(eventGroup: JsonValue): boolean {
  return isJsonObject(eventGroup) && eventGroup.matcher === undefined && Array.isArray(eventGroup.hooks);
}

function hasVoiceLintCommandHandler(hooks: JsonArray, command: string): boolean {
  return hooks.some((hook) => isCommandHook(hook, command));
}

function isCommandHook(hook: JsonValue, command: string): boolean {
  return isJsonObject(hook) && hook.type === "command" && hook.command === command;
}

function createInvalidMergeResult(message: string): CodexHookMergeFailure {
  return { ok: false, message };
}
