import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../..", import.meta.url);
const readProjectFile = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("acessibilidade básica do Lunex", () => {
  it("mantém um foco visível para todos os controles interativos", () => {
    const css = readProjectFile("client/src/index.css");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 2px solid var(--ring)");
  });

  it("expõe rótulos e controles nativos no workspace de artefatos", () => {
    const workspace = readProjectFile("client/src/components/ArtifactWorkspace.tsx");
    expect(workspace).toContain("aria-label={`Editar ${artifact.filePath}`}");
    expect(workspace).toContain('<TabsTrigger value="code"');
    expect(workspace).toContain('<TabsTrigger value="preview"');
    expect(workspace).toContain("onClick={() => onRestore?.(version.version)}");
  });
});
