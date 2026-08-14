import { describe, expect, it } from "vitest";
import { parseAgentArtifacts } from "./artifacts";

describe("parseAgentArtifacts", () => {
  it("extrai arquivos nomeados e preserva o modo de preview", () => {
    const result = parseAgentArtifacts([
      "```tsx src/App.tsx",
      "export function App() { return <main>Olá</main>; }",
      "```",
      "```html public/index.html",
      "<h1>Olá</h1>",
      "```",
    ].join("\n"));

    expect(result).toEqual([
      expect.objectContaining({ filePath: "src/App.tsx", language: "tsx", previewMode: "react" }),
      expect.objectContaining({ filePath: "public/index.html", language: "html", previewMode: "html" }),
    ]);
  });

  it("ignora blocos sem caminho, duplicados e caminhos que escapam do projeto", () => {
    const result = parseAgentArtifacts([
      "```tsx",
      "const ignored = true;",
      "```",
      "```ts ../secret.ts",
      "export const ignored = true;",
      "```",
      "```ts src/config.ts",
      "export const a = 1;",
      "```",
      "```ts src/config.ts",
      "export const a = 2;",
      "```",
    ].join("\n"));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ filePath: "src/config.ts", content: "export const a = 1;" });
  });
});
