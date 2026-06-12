import { describe, expect, it } from "vitest";

import type { Diagnostic } from "../../src/diagnostics/diagnostic.js";
import { sortDiagnostics } from "../../src/diagnostics/sort-diagnostics.js";

describe("sortDiagnostics", () => {
  it("sorts diagnostics by file, range, and rule id", () => {
    const diagnostics = sortDiagnostics([
      createDiagnostic("b.md", 1, 1, 1, 2, "style.b"),
      createDiagnostic("a.md", 2, 1, 2, 2, "style.c"),
      createDiagnostic("a.md", 1, 2, 1, 4, "style.c"),
      createDiagnostic("a.md", 1, 2, 1, 3, "style.b"),
      createDiagnostic("a.md", 1, 2, 1, 3, "style.a"),
    ]);

    expect(
      diagnostics.map(
        (diagnostic) =>
          `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}:${diagnostic.endLine}:${diagnostic.endColumn}:${diagnostic.ruleId}`,
      ),
    ).toEqual([
      "a.md:1:2:1:3:style.a",
      "a.md:1:2:1:3:style.b",
      "a.md:1:2:1:4:style.c",
      "a.md:2:1:2:2:style.c",
      "b.md:1:1:1:2:style.b",
    ]);
  });
});

function createDiagnostic(
  file: string,
  line: number,
  column: number,
  endLine: number,
  endColumn: number,
  ruleId: string,
): Diagnostic {
  return {
    file,
    line,
    column,
    endLine,
    endColumn,
    profile: "product",
    ruleId,
    severity: "warning",
    message: "Diagnostic message.",
  };
}
