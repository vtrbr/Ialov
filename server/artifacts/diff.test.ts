import { describe, expect, it } from "vitest";
import { applyTextPatches, lineDiff } from "./diff";

describe("artifact diff utilities", () => {
  it("aplica patches em ordem inversa sem deslocar índices", () => {
    const result = applyTextPatches("const theme = 'light';", [
      { start: 14, end: 21, replacement: "'dark'" },
      { start: 0, end: 5, replacement: "let" },
    ]);

    expect(result).toBe("let theme = 'dark';");
  });

  it("rejeita patches com intervalos sobrepostos", () => {
    expect(() => applyTextPatches("abcdef", [
      { start: 1, end: 4, replacement: "X" },
      { start: 3, end: 5, replacement: "Y" },
    ])).toThrow("sobrepor");
  });

  it("calcula linhas adicionadas, removidas e preservadas", () => {
    const result = lineDiff("linha um\nlinha antiga\nlinha três", "linha um\nlinha nova\nlinha três");

    expect(result).toEqual([
      { type: "same", value: "linha um", beforeLine: 1, afterLine: 1 },
      { type: "remove", value: "linha antiga", beforeLine: 2 },
      { type: "add", value: "linha nova", afterLine: 2 },
      { type: "same", value: "linha três", beforeLine: 3, afterLine: 3 },
    ]);
  });
});
