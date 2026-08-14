import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markdown: vi.fn(),
  pdf: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("./exportDownload", () => ({
  downloadMarkdown: mocks.markdown,
  downloadPdf: mocks.pdf,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

import { exportContent } from "./exportFlow";

describe("exportContent", () => {
  const payload = { title: "Conversa Lunex", markdown: "# Conteúdo", fileName: "conversa.md" };

  it("informa a falha ao usuário quando a criação do download Markdown não é possível", async () => {
    mocks.markdown.mockImplementationOnce(() => { throw new Error("URL bloqueada"); });

    await expect(exportContent(payload, "markdown")).resolves.toBe(false);
    expect(mocks.error).toHaveBeenCalledWith("Não foi possível preparar o arquivo para download.");
  });

  it("informa a falha ao usuário quando a geração PDF rejeita", async () => {
    mocks.pdf.mockRejectedValueOnce(new Error("PDF indisponível"));

    await expect(exportContent(payload, "pdf")).resolves.toBe(false);
    expect(mocks.pdf).toHaveBeenCalledWith(payload.markdown, "conversa.pdf", payload.title);
    expect(mocks.error).toHaveBeenCalledWith("Não foi possível preparar o arquivo para download.");
  });

  it("confirma ao usuário quando o arquivo é preparado", async () => {
    await expect(exportContent(payload, "markdown")).resolves.toBe(true);
    expect(mocks.success).toHaveBeenCalledWith("Download em Markdown iniciado.");
  });
});
