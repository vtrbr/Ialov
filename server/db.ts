import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  agentRunEvents,
  agentRuns,
  artifacts,
  artifactVersions,
  conversations,
  InsertUser,
  messages,
  projects,
  providerConfigs,
  userPreferences,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Falha ao inicializar conexão:", error);
      database = null;
    }
  }
  return database;
}

function requireDatabase(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("openId é obrigatório para atualizar o usuário.");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  for (const key of ["name", "email", "loginMethod"] as const) {
    if (user[key] !== undefined) {
      values[key] = user[key];
      updateSet[key] = user[key];
    }
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function listProjects(ownerId: number) {
  const db = requireDatabase(await getDb());
  return db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(desc(projects.updatedAt));
}

export async function getProject(ownerId: number, projectId: string) {
  const db = requireDatabase(await getDb());
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

export async function createProject(ownerId: number, input: { name: string; description?: string; template?: string }) {
  const db = requireDatabase(await getDb());
  const id = nanoid(18);
  await db.insert(projects).values({
    id,
    ownerId,
    name: input.name,
    description: input.description || null,
    template: input.template || "blank",
  });
  return getProject(ownerId, id);
}

export async function createConversation(ownerId: number, input: { projectId: string; title: string }) {
  const db = requireDatabase(await getDb());
  const project = await getProject(ownerId, input.projectId);
  if (!project) throw new Error("Projeto não encontrado.");
  const id = nanoid(18);
  await db.insert(conversations).values({ id, ownerId, projectId: input.projectId, title: input.title });
  return getConversation(ownerId, id);
}

export async function getConversation(ownerId: number, conversationId: string) {
  const db = requireDatabase(await getDb());
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

export async function listConversations(ownerId: number, projectId: string) {
  const db = requireDatabase(await getDb());
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), eq(conversations.ownerId, ownerId)))
    .orderBy(desc(conversations.updatedAt));
}

export async function listMessages(ownerId: number, conversationId: string) {
  const db = requireDatabase(await getDb());
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.ownerId, ownerId)))
    .orderBy(asc(messages.createdAt));
}

export async function createMessage(
  ownerId: number,
  input: {
    projectId: string;
    conversationId: string;
    role: "system" | "user" | "assistant" | "tool";
    kind?: "message" | "thinking" | "tool_call" | "tool_result" | "error";
    content: string;
    metadataJson?: string;
    isFinal?: boolean;
  }
) {
  const db = requireDatabase(await getDb());
  const conversation = await getConversation(ownerId, input.conversationId);
  if (!conversation || conversation.projectId !== input.projectId) throw new Error("Conversa não encontrada.");
  const id = nanoid(18);
  await db.insert(messages).values({
    id,
    ownerId,
    projectId: input.projectId,
    conversationId: input.conversationId,
    role: input.role,
    kind: input.kind || "message",
    content: input.content,
    metadataJson: input.metadataJson || null,
    isFinal: input.isFinal ?? true,
  });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, input.conversationId));
  return id;
}

export async function listArtifacts(ownerId: number, projectId: string) {
  const db = requireDatabase(await getDb());
  return db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.projectId, projectId), eq(artifacts.ownerId, ownerId)))
    .orderBy(desc(artifacts.updatedAt));
}

export async function getArtifact(ownerId: number, artifactId: string) {
  const db = requireDatabase(await getDb());
  const rows = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.id, artifactId), eq(artifacts.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

export async function getArtifactByProjectPath(ownerId: number, projectId: string, filePath: string) {
  const db = requireDatabase(await getDb());
  const rows = await db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.ownerId, ownerId), eq(artifacts.projectId, projectId), eq(artifacts.filePath, filePath)))
    .limit(1);
  return rows[0];
}

export async function createArtifact(
  ownerId: number,
  input: {
    projectId: string;
    conversationId?: string;
    title: string;
    filePath: string;
    language?: string;
    kind?: "code" | "html" | "markdown" | "image_prompt" | "other";
    content: string;
    previewMode?: "none" | "html" | "react";
    summary?: string;
  }
) {
  const db = requireDatabase(await getDb());
  const project = await getProject(ownerId, input.projectId);
  if (!project) throw new Error("Projeto não encontrado.");
  if (input.conversationId) {
    const conversation = await getConversation(ownerId, input.conversationId);
    if (!conversation || conversation.projectId !== input.projectId) {
      throw new Error("Conversa não pertence ao projeto informado.");
    }
  }
  const id = nanoid(18);
  await db.insert(artifacts).values({
    id,
    ownerId,
    projectId: input.projectId,
    conversationId: input.conversationId || null,
    title: input.title,
    filePath: input.filePath,
    language: input.language || "text",
    kind: input.kind || "code",
    content: input.content,
    previewMode: input.previewMode || "none",
  });
  await db.insert(artifactVersions).values({
    id: nanoid(18),
    artifactId: id,
    ownerId,
    projectId: input.projectId,
    version: 1,
    operation: "create",
    summary: input.summary || "Criação inicial do artefato",
    content: input.content,
  });
  return getArtifact(ownerId, id);
}

export async function listArtifactVersions(ownerId: number, artifactId: string) {
  const db = requireDatabase(await getDb());
  return db
    .select()
    .from(artifactVersions)
    .where(and(eq(artifactVersions.artifactId, artifactId), eq(artifactVersions.ownerId, ownerId)))
    .orderBy(desc(artifactVersions.version));
}

export async function updateArtifact(
  ownerId: number,
  input: { artifactId: string; content: string; summary: string; operation: "edit" | "restore"; patchJson?: string }
) {
  const db = requireDatabase(await getDb());
  const artifact = await getArtifact(ownerId, input.artifactId);
  if (!artifact) throw new Error("Artefato não encontrado.");
  const nextVersion = artifact.version + 1;
  await db
    .update(artifacts)
    .set({ content: input.content, version: nextVersion, updatedAt: new Date() })
    .where(and(eq(artifacts.id, artifact.id), eq(artifacts.ownerId, ownerId)));
  await db.insert(artifactVersions).values({
    id: nanoid(18),
    artifactId: artifact.id,
    projectId: artifact.projectId,
    ownerId,
    version: nextVersion,
    operation: input.operation,
    summary: input.summary,
    content: input.content,
    patchJson: input.patchJson || null,
  });
  return getArtifact(ownerId, artifact.id);
}

export async function upsertExtractedArtifact(
  ownerId: number,
  input: {
    projectId: string;
    conversationId: string;
    title: string;
    filePath: string;
    language: string;
    kind: "code" | "html";
    content: string;
    previewMode: "none" | "html" | "react";
  }
) {
  const existing = await getArtifactByProjectPath(ownerId, input.projectId, input.filePath);
  if (!existing) {
    const artifact = await createArtifact(ownerId, { ...input, summary: "Artefato criado pela resposta do agente" });
    return { artifact, action: "created" as const };
  }
  if (existing.content === input.content) return { artifact: existing, action: "unchanged" as const };
  const artifact = await updateArtifact(ownerId, {
    artifactId: existing.id,
    content: input.content,
    summary: "Artefato atualizado pela resposta do agente",
    operation: "edit",
  });
  return { artifact, action: "updated" as const };
}

export async function createAgentRun(ownerId: number, input: { projectId: string; conversationId: string }) {
  const db = requireDatabase(await getDb());
  const [project, conversation] = await Promise.all([
    getProject(ownerId, input.projectId),
    getConversation(ownerId, input.conversationId),
  ]);
  if (!project || !conversation || conversation.projectId !== project.id) {
    throw new Error("Projeto ou conversa não encontrados para criar a execução.");
  }
  const id = nanoid(18);
  await db.insert(agentRuns).values({
    id,
    ownerId,
    projectId: input.projectId,
    conversationId: input.conversationId,
    status: "queued",
  });
  return id;
}

export async function getAgentRun(ownerId: number, runId: string, projectId?: string) {
  const db = requireDatabase(await getDb());
  const conditions = [eq(agentRuns.id, runId), eq(agentRuns.ownerId, ownerId)];
  if (projectId) conditions.push(eq(agentRuns.projectId, projectId));
  const rows = await db.select().from(agentRuns).where(and(...conditions)).limit(1);
  return rows[0];
}

export async function appendRunEvent(
  ownerId: number,
  input: { runId: string; projectId: string; sequence: number; type: string; payload: unknown }
) {
  const db = requireDatabase(await getDb());
  const run = await getAgentRun(ownerId, input.runId, input.projectId);
  if (!run) throw new Error("Execução não encontrada para registrar o evento.");
  await db.insert(agentRunEvents).values({
    ownerId,
    runId: input.runId,
    projectId: input.projectId,
    sequence: input.sequence,
    type: input.type,
    payloadJson: JSON.stringify(input.payload),
  });
}

export async function updateAgentRun(
  ownerId: number,
  runId: string,
  input: Partial<{
    status: "queued" | "running" | "awaiting_confirmation" | "completed" | "failed" | "cancelled";
    providerConfigId: string | null;
    model: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    metadataJson: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }>
) {
  const db = requireDatabase(await getDb());
  await db.update(agentRuns).set(input).where(and(eq(agentRuns.id, runId), eq(agentRuns.ownerId, ownerId)));
}

export async function listProviderConfigs(ownerId: number) {
  const db = requireDatabase(await getDb());
  return db
    .select({
      id: providerConfigs.id,
      slot: providerConfigs.slot,
      provider: providerConfigs.provider,
      model: providerConfigs.model,
      baseUrl: providerConfigs.baseUrl,
      priority: providerConfigs.priority,
      enabled: providerConfigs.enabled,
      failureCount: providerConfigs.failureCount,
      lastFailureAt: providerConfigs.lastFailureAt,
      lastSuccessAt: providerConfigs.lastSuccessAt,
      apiKeyFingerprint: providerConfigs.apiKeyFingerprint,
      createdAt: providerConfigs.createdAt,
      updatedAt: providerConfigs.updatedAt,
    })
    .from(providerConfigs)
    .where(eq(providerConfigs.ownerId, ownerId))
    .orderBy(asc(providerConfigs.priority));
}

export type ProviderSlot = "text_1" | "text_2" | "text_3" | "text_4" | "image_1";
export type ProviderName = "openai" | "anthropic" | "gemini" | "compatible" | "other";

export async function upsertProviderConfig(
  ownerId: number,
  input: {
    slot: ProviderSlot;
    provider: ProviderName;
    model: string;
    baseUrl?: string | null;
    apiKeyCiphertext: string;
    apiKeyFingerprint: string;
    priority: number;
    enabled: boolean;
  }
) {
  const db = requireDatabase(await getDb());
  await db
    .insert(providerConfigs)
    .values({ id: nanoid(18), ownerId, ...input })
    .onDuplicateKeyUpdate({
      set: {
        provider: input.provider,
        model: input.model,
        baseUrl: input.baseUrl || null,
        apiKeyCiphertext: input.apiKeyCiphertext,
        apiKeyFingerprint: input.apiKeyFingerprint,
        priority: input.priority,
        enabled: input.enabled,
        failureCount: 0,
        lastFailureAt: null,
        updatedAt: new Date(),
      },
    });
  const rows = await db
    .select()
    .from(providerConfigs)
    .where(and(eq(providerConfigs.ownerId, ownerId), eq(providerConfigs.slot, input.slot)))
    .limit(1);
  return rows[0];
}

export async function setProviderEnabled(ownerId: number, slot: ProviderSlot, enabled: boolean) {
  const db = requireDatabase(await getDb());
  await db
    .update(providerConfigs)
    .set({ enabled, updatedAt: new Date() })
    .where(and(eq(providerConfigs.ownerId, ownerId), eq(providerConfigs.slot, slot)));
}

export async function listRoutableProviders(ownerId: number, lane: "text" | "image") {
  const db = requireDatabase(await getDb());
  const slots: ProviderSlot[] = lane === "image" ? ["image_1"] : ["text_1", "text_2", "text_3", "text_4"];
  const all = await db
    .select()
    .from(providerConfigs)
    .where(and(eq(providerConfigs.ownerId, ownerId), eq(providerConfigs.enabled, true)))
    .orderBy(asc(providerConfigs.priority), asc(providerConfigs.updatedAt));
  return all.filter(config => slots.includes(config.slot));
}

export async function recordProviderSuccess(ownerId: number, configId: string) {
  const db = requireDatabase(await getDb());
  await db
    .update(providerConfigs)
    .set({ failureCount: 0, lastSuccessAt: new Date(), updatedAt: new Date() })
    .where(and(eq(providerConfigs.id, configId), eq(providerConfigs.ownerId, ownerId)));
}

export async function recordProviderFailure(ownerId: number, configId: string) {
  const db = requireDatabase(await getDb());
  await db
    .update(providerConfigs)
    .set({ failureCount: sql`${providerConfigs.failureCount} + 1`, lastFailureAt: new Date(), updatedAt: new Date() })
    .where(and(eq(providerConfigs.id, configId), eq(providerConfigs.ownerId, ownerId)));
}

export async function getPreferences(ownerId: number) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(userPreferences).where(eq(userPreferences.ownerId, ownerId)).limit(1);
  return rows[0];
}

export async function upsertPreferences(
  ownerId: number,
  input: Partial<{
    autonomyMode: "ask" | "autonomous";
    preferredTextSlot: string | null;
    firebaseProjectId: string | null;
    firebaseAuthConfigured: boolean;
    firestoreConfigured: boolean;
  }>
) {
  const db = requireDatabase(await getDb());
  await db
    .insert(userPreferences)
    .values({ ownerId, ...input })
    .onDuplicateKeyUpdate({ set: { ...input, updatedAt: new Date() } });
  return getPreferences(ownerId);
}
