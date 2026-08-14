import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const databaseMock = vi.hoisted(() => ({
  createProject: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  getArtifact: vi.fn(),
  listArtifacts: vi.fn(),
  createArtifact: vi.fn(),
  listArtifactVersions: vi.fn(),
  updateArtifact: vi.fn(),
  getPreferences: vi.fn(),
  upsertPreferences: vi.fn(),
}));

vi.mock("../db", () => databaseMock);

import { appRouter } from "../routers";

function contextFor(userId = 71): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: "Lunex Tester",
      email: "tester@lunex.dev",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("studio router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("associa um novo projeto ao usuário autenticado", async () => {
    databaseMock.createProject.mockResolvedValue({ id: "prj_lunex_0001", ownerId: 71, name: "Meu projeto" });
    const caller = appRouter.createCaller(contextFor(71));

    const result = await caller.studio.projects.create({ name: "Meu projeto" });

    expect(databaseMock.createProject).toHaveBeenCalledWith(71, { name: "Meu projeto" });
    expect(result).toMatchObject({ id: "prj_lunex_0001", ownerId: 71 });
  });

  it("impede acesso de consulta de projeto a usuário diferente", async () => {
    databaseMock.getProject.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(contextFor(72));

    await expect(caller.studio.projects.get({ projectId: "project-visible-to-71" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(databaseMock.getProject).toHaveBeenCalledWith(72, "project-visible-to-71");
  });

  it("retorna preferências iniciais quando o usuário ainda não possui registro", async () => {
    databaseMock.getPreferences.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(contextFor(71));

    await expect(caller.studio.preferences.get()).resolves.toMatchObject({
      autonomyMode: "ask",
      preferredTextSlot: null,
      firebaseProjectId: null,
      firebaseAuthConfigured: false,
      firestoreConfigured: false,
    });
  });

  it("impede exportação de conversa que não pertence ao usuário autenticado", async () => {
    databaseMock.getConversation.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(contextFor(72));

    await expect(caller.studio.exports.conversation({ conversationId: "conversation-visible-to-71" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(databaseMock.getConversation).toHaveBeenCalledWith(72, "conversation-visible-to-71");
    expect(databaseMock.listMessages).not.toHaveBeenCalled();
  });

  it("monta exportação de artefato com conteúdo do proprietário", async () => {
    databaseMock.getArtifact.mockResolvedValue({ id: "artifact-lunex-001", ownerId: 71, title: "App", filePath: "src/App.tsx", language: "tsx", kind: "code", version: 1, content: "export default null", updatedAt: new Date("2026-08-14T12:00:00.000Z") });
    databaseMock.listArtifactVersions.mockResolvedValue([]);
    const caller = appRouter.createCaller(contextFor(71));

    const result = await caller.studio.exports.artifact({ artifactId: "artifact-lunex-001", includeHistory: true });

    expect(databaseMock.getArtifact).toHaveBeenCalledWith(71, "artifact-lunex-001");
    expect(databaseMock.listArtifactVersions).toHaveBeenCalledWith(71, "artifact-lunex-001");
    expect(result.markdown).toContain("export default null");
  });

  it("restaura a versão solicitada criando uma nova versão auditável", async () => {
    databaseMock.getArtifact.mockResolvedValue({ id: "artifact-lunex-001", ownerId: 71, projectId: "project-lunex-001" });
    databaseMock.listArtifactVersions.mockResolvedValue([
      { artifactId: "artifact-lunex-001", version: 3, content: "<main>Versão estável</main>" },
    ]);
    databaseMock.updateArtifact.mockResolvedValue({ id: "artifact-lunex-001", version: 4 });
    const caller = appRouter.createCaller(contextFor(71));

    await caller.studio.artifacts.restore({ artifactId: "artifact-lunex-001", version: 3 });

    expect(databaseMock.updateArtifact).toHaveBeenCalledWith(71, {
      artifactId: "artifact-lunex-001",
      content: "<main>Versão estável</main>",
      summary: "Restauração da versão 3",
      operation: "restore",
    });
  });

  it("não permite gravar artefato vinculado a conversa fora do projeto", async () => {
    databaseMock.createArtifact.mockRejectedValue(new Error("Conversa não pertence ao projeto informado."));
    const caller = appRouter.createCaller(contextFor(71));

    await expect(
      caller.studio.artifacts.create({
        projectId: "project-lunex-001",
        conversationId: "conversation-of-another-project",
        title: "App.tsx",
        filePath: "src/App.tsx",
        content: "export default function App() { return null; }",
      })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

    expect(databaseMock.createArtifact).toHaveBeenCalledWith(71, expect.objectContaining({
      projectId: "project-lunex-001",
      conversationId: "conversation-of-another-project",
    }));
  });

  it("aplica edição incremental apenas quando a versão-base confere", async () => {
    databaseMock.getArtifact.mockResolvedValue({ id: "artifact-lunex-001", ownerId: 71, version: 2, content: "const theme = 'light';" });
    databaseMock.updateArtifact.mockResolvedValue({ id: "artifact-lunex-001", version: 3 });
    const caller = appRouter.createCaller(contextFor(71));

    await caller.studio.artifacts.applyPatch({
      artifactId: "artifact-lunex-001",
      baseVersion: 2,
      summary: "Alterar o tema padrão",
      patches: [{ start: 14, end: 21, replacement: "'dark'" }],
    });

    expect(databaseMock.updateArtifact).toHaveBeenCalledWith(71, expect.objectContaining({
      artifactId: "artifact-lunex-001",
      content: "const theme = 'dark';",
      operation: "edit",
    }));
  });

  it("rejeita edição incremental com versão-base desatualizada", async () => {
    databaseMock.getArtifact.mockResolvedValue({ id: "artifact-lunex-001", ownerId: 71, version: 4, content: "conteúdo atual" });
    const caller = appRouter.createCaller(contextFor(71));

    await expect(caller.studio.artifacts.applyPatch({
      artifactId: "artifact-lunex-001",
      baseVersion: 3,
      summary: "Tentativa desatualizada",
      patches: [{ start: 0, end: 0, replacement: "// " }],
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
