import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { Diagnostic } from "../../src/diagnostics/diagnostic.js";
import { formatAgentDiagnostics } from "../../src/output/agent-format.js";
import { formatJsonDiagnostics } from "../../src/output/json-format.js";
import { formatPrettyDiagnostics } from "../../src/output/pretty-format.js";
import { createDiagnosticSummary } from "../../src/output/summary.js";

const jsonOutputSchema = z.object({
  summary: z.object({
    scannedFileCount: z.number(),
    diagnosticCount: z.number(),
    errorCount: z.number(),
    warningCount: z.number(),
    exitCode: z.number(),
  }),
  diagnostics: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
      endLine: z.number(),
      endColumn: z.number(),
      profile: z.string(),
      ruleId: z.string(),
      severity: z.enum(["error", "warning"]),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
});

describe("diagnostic formatters", () => {
  it("formats pretty output for humans", () => {
    const diagnostics = createDiagnostics();
    const summary = createDiagnosticSummary(2, diagnostics);

    expect(formatPrettyDiagnostics(summary, diagnostics)).toBe(
      [
        "docs/readme.md:1:5  warning  style.no-en-dash  Avoid en dash.",
        "guides/setup.md:2:3  error    style.no-em-dash  Avoid em dash.",
        "  Suggestion: Use a comma.",
        "",
        "1 error, 1 warning in 2 files",
        "",
      ].join("\n"),
    );
  });

  it("formats valid stable json output", () => {
    const diagnostics = createDiagnostics();
    const summary = createDiagnosticSummary(2, diagnostics);
    const output = formatJsonDiagnostics(summary, diagnostics);

    expect(output).toBe(
      formatJsonDiagnostics(summary, [...diagnostics].reverse()),
    );
    expect(jsonOutputSchema.parse(JSON.parse(output) as unknown)).toEqual({
      summary: {
        scannedFileCount: 2,
        diagnosticCount: 2,
        errorCount: 1,
        warningCount: 1,
        exitCode: 1,
      },
      diagnostics: [
        {
          file: "docs/readme.md",
          line: 1,
          column: 5,
          endLine: 1,
          endColumn: 6,
          profile: "product",
          ruleId: "style.no-en-dash",
          severity: "warning",
          message: "Avoid en dash.",
        },
        {
          file: "guides/setup.md",
          line: 2,
          column: 3,
          endLine: 2,
          endColumn: 4,
          profile: "product",
          ruleId: "style.no-em-dash",
          severity: "error",
          message: "Avoid em dash.",
          suggestion: "Use a comma.",
        },
      ],
    });
  });

  it("formats concise agent output", () => {
    const diagnostics = createDiagnostics();
    const summary = createDiagnosticSummary(2, diagnostics);

    expect(formatAgentDiagnostics(summary, diagnostics)).toBe(
      [
        "docs/readme.md:1:5 [warning] style.no-en-dash Avoid en dash.",
        "guides/setup.md:2:3 [error] style.no-em-dash Avoid em dash.",
        "Suggestion: Use a comma.",
        "Summary: 1 error, 1 warning in 2 files",
        "",
      ].join("\n"),
    );
  });
});

function createDiagnostics(): readonly Diagnostic[] {
  return [
    {
      file: "guides/setup.md",
      line: 2,
      column: 3,
      endLine: 2,
      endColumn: 4,
      profile: "product",
      ruleId: "style.no-em-dash",
      severity: "error",
      message: "Avoid em dash.",
      suggestion: "Use a comma.",
    },
    {
      file: "docs/readme.md",
      line: 1,
      column: 5,
      endLine: 1,
      endColumn: 6,
      profile: "product",
      ruleId: "style.no-en-dash",
      severity: "warning",
      message: "Avoid en dash.",
    },
  ];
}
