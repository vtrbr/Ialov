import { describe, expect, it, vi } from "vitest";

const databaseMock = vi.hoisted(() => ({
  createAgentRun: vi.fn(),
  appendRunEvent: vi.fn(),
  createMessage: vi.fn(),
  updateAgentRun: vi.fn(),
  listMessages: vi.fn(),
  listRoutableProviders: vi.fn(),
  createArtifact: vi.fn(),
  listArtifacts: vi.fn(),
  recordProviderSuccess: vi.fn(),
  recordProviderFailure: vi.fn(),
}));

const notificationMock = vi.hoisted(() => ({ notifyOwner: vi.fn() }));

vi.mock("../db", () => databaseMock);
vi.mock("../_core/notification", () => notificationMock);

import { runAgent } from "./engine";

describe("runAgent", () => {
  it("produz eventos de streaming em modo demonstração sem depender de chave", async () => {
    databaseMock.createAgentRun.mockResolvedValue("run-demo-001");
    databaseMock.listMessages.mockResolvedValue([{ role: "user", content: "Crie uma página de boas-vindas" }]);
    databaseMock.listRoutableProviders.mockResolvedValue([]);
    databaseMock.listArtifacts.mockResolvedValue([{ filePath: "src/App.tsx", language: "tsx" }]);
    databaseMock.appendRunEvent.mockResolvedValue(undefined);
    databaseMock.createMessage.mockResolvedValue(undefined);
    databaseMock.updateAgentRun.mockResolvedValue(undefined);

    const events = [];
    for await (const event of runAgent({
      ownerId: 7,
      projectId: "project-demo-001",
      conversationId: "conversation-demo-001",
      prompt: "Crie uma página de boas-vindas",
    })) {
      events.push(event);
    }

    expect(events[0]).toMatchObject({ type: "run.started", runId: "run-demo-001" });
    expect(events.some(event => event.type === "provider.selected" && event.payload.mode === "demo")).toBe(true);
    expect(events.some(event => event.type === "tool.started" && event.payload.tool === "project_context")).toBe(true);
    expect(events.some(event => event.type === "tool.completed" && event.payload.artifactCount === 1)).toBe(true);
    expect(events.some(event => event.type === "text.delta")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "run.completed" });
    expect(databaseMock.updateAgentRun).toHaveBeenCalledWith(7, "run-demo-001", expect.objectContaining({ status: "completed" }));
    expect(notificationMock.notifyOwner).not.toHaveBeenCalled();
  });
});
