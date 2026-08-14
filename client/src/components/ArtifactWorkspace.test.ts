import { describe, expect, it } from "vitest";
import { workspacePreviewBinding } from "./ArtifactWorkspace";
import { buildPreviewDocument } from "./ArtifactPreview";

describe("ArtifactWorkspace preview binding", () => {
  it("encaminha imediatamente o rascunho atual do editor para o preview", () => {
    const before = workspacePreviewBinding("<h1>Antes</h1>", "html");
    const after = workspacePreviewBinding("<h1>Depois</h1>", "html");

    expect(before.content).toBe("<h1>Antes</h1>");
    expect(after.content).toBe("<h1>Depois</h1>");
    expect(buildPreviewDocument(after.content, after.mode)).toContain("Depois");
    expect(buildPreviewDocument(after.content, after.mode)).not.toContain("Antes");
  });
});
