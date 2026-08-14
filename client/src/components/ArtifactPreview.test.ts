import { describe, expect, it } from "vitest";
import { buildPreviewDocument, previewSandbox } from "./ArtifactPreview";

describe("ArtifactPreview", () => {
  it("mantém o preview em sandbox e recompõe o documento quando o conteúdo muda", () => {
    const first = buildPreviewDocument("<h1>Primeira versão</h1>", "html");
    const second = buildPreviewDocument("<h1>Segunda versão</h1>", "html");

    expect(previewSandbox).toBe("allow-scripts");
    expect(first).toContain("Content-Security-Policy");
    expect(first).toContain("connect-src 'none'");
    expect(first).toContain("Primeira versão");
    expect(second).toContain("Segunda versão");
    expect(second).not.toBe(first);
  });

  it("prepara um documento React isolado quando solicitado", () => {
    const document = buildPreviewDocument("export default function App() { return <main>Oi</main>; }", "react");
    expect(document).toContain("react.production.min.js");
    expect(document).toContain("@babel/standalone");
    expect(buildPreviewDocument("texto", "none")).toBe("");
  });
});
