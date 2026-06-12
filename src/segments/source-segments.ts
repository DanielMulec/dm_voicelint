import { extname } from "node:path";

import type { TextSource } from "../input/read-source.js";
import { createMarkdownSegments } from "./markdown-segments.js";
import { createPlainTextSegments } from "./plain-text-segments.js";
import type { TextSegment } from "./segment.js";

export interface SourceSegments {
  readonly isMarkdownSource: boolean;
  readonly segments: readonly TextSegment[];
}

// File-type routing lives at the source boundary so rule evaluation never needs
// to know how Markdown and plain text are divided into lintable spans.
export function createSourceSegments(source: TextSource): SourceSegments {
  return isMarkdownFilePath(source.path)
    ? {
        isMarkdownSource: true,
        segments: createMarkdownSegments(source.content),
      }
    : {
        isMarkdownSource: false,
        segments: createLintablePlainTextSegments(source.content),
      };
}

function createLintablePlainTextSegments(sourceText: string): readonly TextSegment[] {
  return createPlainTextSegments(sourceText).filter(isParagraphSegment);
}

function isParagraphSegment(segment: TextSegment): boolean {
  return segment.kind === "paragraph";
}

function isMarkdownFilePath(sourcePath: string): boolean {
  const fileExtension = extname(sourcePath).toLowerCase();
  return fileExtension === ".md" || fileExtension === ".mdx";
}
