import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const databaseMock = vi.hoisted(() => ({
  listProviderConfigs: vi.fn(),
  upsertProviderConfig: vi.fn(),
  setProviderEnabled: vi.fn(),
  listRoutableProviders: vi.fn(),
  recordProviderSuccess: vi.fn(),
  recordProviderFailure: vi.fn(),
  getProject: vi.fn(),
  getConversation: vi.fn(),
  createArtifact: vi.fn(),
}));

vi.mock("../db", () => databaseMock);

import { appRouter } from "../routers";

function adminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "lunex-owner",
      name: "Lunex Owner",
      email: "owner@lunex.dev",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("agent provider configuration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cifra a chave no servidor e nunca a devolve ao cliente", async () => {
    databaseMock.upsertProviderConfig.mockResolvedValue({
      id: "provider-config-001",
      slot: "text_1",
      provider: "openai",
      model: "gpt-5-mini",
      baseUrl: null,
      priority: 0,
      enabled: true,
      apiKeyFingerprint: "a1b2c3d4e5f6a7b8",
      apiKeyCiphertext: "ciphertext-only-on-server",
    });
    const caller = appRouter.createCaller(adminContext());

    const result = await caller.agent.providers.save({
      slot: "text_1",
      provider: "openai",
      model: "gpt-5-mini",
      apiKey: "sk-secret-should-never-return",
      priority: 0,
      enabled: true,
    });

    expect(databaseMock.upsertProviderConfig).toHaveBeenCalledWith(1, expect.objectContaining({
      apiKeyFingerprint: expect.any(String),
      apiKeyCiphertext: expect.any(String),
    }));
    expect(JSON.stringify(result)).not.toContain("sk-secret-should-never-return");
    expect(result).not.toHaveProperty("apiKeyCiphertext");
    expect(result).toMatchObject({ slot: "text_1", provider: "openai", enabled: true });
  });

  it("remove ciphertexts da listagem de provedores", async () => {
    databaseMock.listProviderConfigs.mockResolvedValue([
      {
        id: "provider-config-001",
        slot: "text_1",
        provider: "openai",
        model: "gpt-5-mini",
        baseUrl: null,
        priority: 0,
        enabled: true,
        apiKeyFingerprint: "a1b2c3d4e5f6a7b8",
        apiKeyCiphertext: "ciphertext-only-on-server",
        failureCount: 0,
        lastFailureAt: null,
        lastSuccessAt: null,
        updatedAt: new Date(),
      },
    ]);
    const caller = appRouter.createCaller(adminContext());

    const result = await caller.agent.providers.list();

    expect(JSON.stringify(result)).not.toContain("ciphertext-only-on-server");
    expect(result[0]).not.toHaveProperty("apiKeyCiphertext");
    expect(result[0]).toMatchObject({ slot: "text_1", apiKeyFingerprint: "a1b2c3d4e5f6a7b8" });
  });
});
