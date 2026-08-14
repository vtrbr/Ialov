// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const pdf = {
  setProperties: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  splitTextToSize: vi.fn((value: string) => [value]),
  text: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
};

vi.mock("jspdf", () => ({ jsPDF: vi.fn(() => pdf) }));

import { downloadMarkdown, downloadPdf } from "./exportDownload";

describe("export downloads", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gera e aciona download de Markdown com URL descartável", async () => {
    const createUrl = vi.fn(() => "blob:lunex-export");
    const revokeUrl = vi.fn();
    const click = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      const node = document.createElementNS("http://www.w3.org/1999/xhtml", tagName) as HTMLAnchorElement;
      node.click = click;
      return node;
    }) as typeof document.createElement);

    downloadMarkdown("# Conversa", "conversa.md");
    const blob = createUrl.mock.calls[0][0] as Blob;

    expect(blob.type).toBe("text/markdown;charset=utf-8");
    expect(await blob.text()).toBe("# Conversa");
    expect(click).toHaveBeenCalledOnce();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revokeUrl).toHaveBeenCalledWith("blob:lunex-export");
  });

  it("propaga falha de criação de URL para o fluxo que informa o usuário", () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => { throw new Error("URL bloqueada"); }), revokeObjectURL: vi.fn() });

    expect(() => downloadMarkdown("# Conversa", "conversa.md")).toThrow("URL bloqueada");
  });

  it("converte o Markdown para PDF no navegador sem chamar o backend", async () => {
    await downloadPdf("# Título\n\n**Conteúdo** `limpo`", "conversa.pdf", "Conversa Lunex");

    expect(pdf.setProperties).toHaveBeenCalledWith(expect.objectContaining({ title: "Conversa Lunex", creator: "Lunex 1.2" }));
    expect(pdf.text).toHaveBeenCalledWith("Título", 16, expect.any(Number));
    expect(pdf.text).toHaveBeenCalledWith("Conteúdo limpo", 16, expect.any(Number));
    expect(pdf.save).toHaveBeenCalledWith("conversa.pdf");
  });
});
