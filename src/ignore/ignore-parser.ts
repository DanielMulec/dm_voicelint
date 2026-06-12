import { createLineIndex, type IndexedLine } from "../locations/line-index.js";
import type {
  IgnoreComment,
  IgnoreCommentProblem,
  IgnoreDirectiveKind,
  IgnoreTarget,
  ParsedIgnoreComments,
} from "./ignore-comment.js";

const ignoreCommentPattern =
  /^\s*<!--\s*voicelint-(disable-next-line|disable|enable)\s+(all|[^\s>]+)\s*-->\s*$/u;
const fencePattern = /^\s{0,3}(```+|~~~+).*$/u;

interface FenceStart {
  readonly marker: "`" | "~";
  readonly markerLength: number;
}

export function parseIgnoreComments(sourceText: string): ParsedIgnoreComments {
  const parsedComments = collectIgnoreComments(sourceText);
  const validatedComments = validateIgnoreComments(parsedComments);

  return {
    comments: validatedComments.comments,
    problems: validatedComments.problems,
  };
}

function collectIgnoreComments(
  sourceText: string,
): ParsedIgnoreComments {
  const comments: IgnoreComment[] = [];
  const problems: IgnoreCommentProblem[] = [];
  let activeFence: FenceStart | null = null;

  for (const indexedLine of createLineIndex(sourceText).lines) {
    const parsedLine = readIgnoreDirectiveLine(indexedLine, activeFence);
    activeFence = parsedLine.activeFence;
    pushParsedIgnoreArtifacts(parsedLine, comments, problems);
  }

  return { comments, problems };
}

interface ParsedIgnoreDirectiveLine {
  readonly activeFence: FenceStart | null;
  readonly comment: IgnoreComment | null;
  readonly problem: IgnoreCommentProblem | null;
}

function readIgnoreDirectiveLine(
  indexedLine: IndexedLine,
  activeFence: FenceStart | null,
): ParsedIgnoreDirectiveLine {
  const nextFenceState = readNextFenceState(indexedLine.content, activeFence);
  return shouldSkipIgnoreDirectiveLine(indexedLine, nextFenceState)
    ? createParsedIgnoreDirectiveLine(nextFenceState, null, null)
    : createParsedIgnoreDirectiveCommentLine(indexedLine, nextFenceState);
}

function createParsedIgnoreDirectiveLine(
  activeFence: FenceStart | null,
  comment: IgnoreComment | null,
  problem: IgnoreCommentProblem | null,
): ParsedIgnoreDirectiveLine {
  return {
    activeFence,
    comment,
    problem,
  };
}

function shouldSkipIgnoreDirectiveLine(
  indexedLine: IndexedLine,
  activeFence: FenceStart | null,
): boolean {
  return activeFence !== null || !isIgnoreDirectiveCandidate(indexedLine);
}

function createParsedIgnoreDirectiveCommentLine(
  indexedLine: IndexedLine,
  activeFence: FenceStart | null,
): ParsedIgnoreDirectiveLine {
  const comment = parseIgnoreDirectiveLine(indexedLine);
  if (comment !== null) {
    return createParsedIgnoreDirectiveLine(activeFence, comment, null);
  }

  return createParsedIgnoreDirectiveLine(
    activeFence,
    null,
    createMalformedIgnoreCommentProblem(indexedLine),
  );
}

function pushParsedIgnoreArtifacts(
  parsedLine: ParsedIgnoreDirectiveLine,
  comments: IgnoreComment[],
  problems: IgnoreCommentProblem[],
): void {
  if (parsedLine.comment !== null) {
    comments.push(parsedLine.comment);
  }

  if (parsedLine.problem !== null) {
    problems.push(parsedLine.problem);
  }
}

function readNextFenceState(
  lineContent: string,
  activeFence: FenceStart | null,
): FenceStart | null {
  if (activeFence === null) {
    return readFenceStart(lineContent);
  }

  return isFenceClose(lineContent, activeFence) ? null : activeFence;
}

function readFenceStart(lineContent: string): FenceStart | null {
  const fenceMatch = lineContent.match(fencePattern);
  if (fenceMatch === null) {
    return null;
  }

  const fenceText = readRequiredCaptureGroup(fenceMatch, 1);
  return {
    marker: fenceText.startsWith("`") ? "`" : "~",
    markerLength: fenceText.length,
  };
}

function isFenceClose(lineContent: string, fenceStart: FenceStart): boolean {
  return new RegExp(
    `^\\s{0,3}${fenceStart.marker}{${fenceStart.markerLength},}\\s*$`,
    "u",
  ).test(lineContent);
}

function isIgnoreDirectiveCandidate(indexedLine: IndexedLine): boolean {
  return indexedLine.content.includes("<!--") && indexedLine.content.includes("voicelint-");
}

function parseIgnoreDirectiveLine(indexedLine: IndexedLine): IgnoreComment | null {
  const directiveMatch = indexedLine.content.match(ignoreCommentPattern);
  if (directiveMatch === null) {
    return null;
  }

  return {
    kind: readIgnoreDirectiveKind(directiveMatch),
    target: readIgnoreTarget(directiveMatch),
    line: indexedLine.lineNumber,
  };
}

function readIgnoreDirectiveKind(match: RegExpMatchArray): IgnoreDirectiveKind {
  return readRequiredCaptureGroup(match, 1) as IgnoreDirectiveKind;
}

function readIgnoreTarget(match: RegExpMatchArray): IgnoreTarget {
  return readRequiredCaptureGroup(match, 2);
}

function createMalformedIgnoreCommentProblem(
  indexedLine: IndexedLine,
): IgnoreCommentProblem {
  return {
    kind: "malformed",
    line: indexedLine.lineNumber,
    text: indexedLine.content,
    message: "Malformed VoiceLint ignore comment. Expected a full-line HTML comment with one directive and one rule id or all.",
  };
}

function validateIgnoreComments(
  parsedIgnoreComments: ParsedIgnoreComments,
): ParsedIgnoreComments {
  const activeDisableCounts = new Map<string, number>();
  const comments: IgnoreComment[] = [];
  const problems = [...parsedIgnoreComments.problems];

  for (const comment of parsedIgnoreComments.comments) {
    const validatedComment = validateIgnoreComment(comment, activeDisableCounts);
    if (validatedComment === null) {
      problems.push(createUnmatchedEnableProblem(comment));
      continue;
    }

    comments.push(validatedComment);
  }

  return { comments, problems };
}

function validateIgnoreComment(
  comment: IgnoreComment,
  activeDisableCounts: Map<string, number>,
): IgnoreComment | null {
  if (isEphemeralIgnoreComment(comment)) {
    return comment;
  }

  return validateBlockIgnoreComment(comment, activeDisableCounts);
}

function isEphemeralIgnoreComment(comment: IgnoreComment): boolean {
  return comment.kind === "disable-next-line";
}

function validateBlockIgnoreComment(
  comment: IgnoreComment,
  activeDisableCounts: Map<string, number>,
): IgnoreComment | null {
  if (comment.kind === "disable") {
    incrementActiveDisableCount(activeDisableCounts, comment.target);
    return comment;
  }

  return decrementActiveDisableCount(activeDisableCounts, comment.target)
    ? comment
    : null;
}

function incrementActiveDisableCount(
  activeDisableCounts: Map<string, number>,
  target: IgnoreTarget,
): void {
  const nextCount = (activeDisableCounts.get(target) ?? 0) + 1;
  activeDisableCounts.set(target, nextCount);
}

function decrementActiveDisableCount(
  activeDisableCounts: Map<string, number>,
  target: IgnoreTarget,
): boolean {
  const activeCount = activeDisableCounts.get(target) ?? 0;
  if (activeCount === 0) {
    return false;
  }

  setNextActiveDisableCount(activeDisableCounts, target, activeCount);
  return true;
}

function setNextActiveDisableCount(
  activeDisableCounts: Map<string, number>,
  target: IgnoreTarget,
  activeCount: number,
): void {
  if (activeCount === 1) {
    activeDisableCounts.delete(target);
    return;
  }

  activeDisableCounts.set(target, activeCount - 1);
}

function createUnmatchedEnableProblem(comment: IgnoreComment): IgnoreCommentProblem {
  return {
    kind: "unmatched-enable",
    line: comment.line,
    text: `<!-- voicelint-enable ${comment.target} -->`,
    message: `Unmatched VoiceLint enable comment for ${comment.target}. No earlier disable block is active for that target.`,
  };
}

function readRequiredCaptureGroup(
  match: RegExpMatchArray,
  groupIndex: number,
): string {
  const capturedText = match[groupIndex];
  if (typeof capturedText === "string") {
    return capturedText;
  }

  throw new RangeError(`Missing regular-expression capture group ${groupIndex}.`);
}
