export type IgnoreDirectiveKind = "disable" | "enable" | "disable-next-line";

export type IgnoreTarget = string;

export interface IgnoreComment {
  readonly kind: IgnoreDirectiveKind;
  readonly target: IgnoreTarget;
  readonly line: number;
}

export interface IgnoreCommentProblem {
  readonly kind: "malformed" | "unmatched-enable";
  readonly line: number;
  readonly text: string;
  readonly message: string;
}

export interface ParsedIgnoreComments {
  readonly comments: readonly IgnoreComment[];
  readonly problems: readonly IgnoreCommentProblem[];
}
