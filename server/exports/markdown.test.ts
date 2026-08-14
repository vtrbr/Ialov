import { describe, expect, it } from "vitest";
import { createArtifactMarkdown, createConversationMarkdown, exportFileName, redactSensitiveText } from "./markdown";

describe("exportações em Markdown", () => {
  it("redige chaves e credenciais antes de montar um arquivo", () => {
    const secret = "sk-super-secret-token-value-123456789";
    const geminiKey = "AIzaSyDUMMYKeyValueForRedactionTest123456";
    const content = redactSensitiveText(`api_key=${secret}\n${secret}\n${geminiKey}\npassword: senha-supersecreta`);

    expect(content).not.toContain(secret);
    expect(content).not.toContain(geminiKey);
    expect(content).not.toContain("senha-supersecreta");
    expect(content).toContain("[REDACTED]");
  });

  it("inclui o histórico de conversa em ordem e preserva um arquivo seguro", () => {
    const markdown = createConversationMarkdown(
      { title: "Planejamento", createdAt: new Date("2026-08-14T12:00:00.000Z") },
      [
        { role: "user", kind: "message", content: "Criar um projeto", createdAt: new Date("2026-08-14T12:01:00.000Z") },
        { role: "assistant", kind: "message", content: "Vou começar.", createdAt: new Date("2026-08-14T12:02:00.000Z") },
      ]
    );

    expect(markdown).toContain("# Conversa: Planejamento");
    expect(markdown).toContain("## Usuário");
    expect(markdown).toContain("## Lunex");
  });

  it("exporta a versão atual e o histórico do artefato", () => {
    const markdown = createArtifactMarkdown(
      { title: "Aplicação", filePath: "src/App.tsx", language: "tsx", kind: "code", version: 2, content: "export default function App() {}", updatedAt: new Date("2026-08-14T12:00:00.000Z") },
      [{ version: 1, operation: "create", summary: "Criação inicial", content: "export default null", createdAt: new Date("2026-08-14T11:00:00.000Z") }]
    );

    expect(markdown).toContain("# Artefato: Aplicação");
    expect(markdown).toContain("## Conteúdo atual");
    expect(markdown).toContain("# Histórico de versões");
    expect(exportFileName("artefato-App.tsx", "pdf")).toBe("artefato-app-tsx.pdf");
  });
});
