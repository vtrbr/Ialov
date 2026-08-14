import * as db from "../db";
import { notifyOwner } from "../_core/notification";
import { decryptProviderSecret } from "./crypto";
import { streamTextProvider } from "./providers";
import { ProviderRequestError, type AgentInputMessage, type AgentStreamEvent, type DecryptedProviderConfig } from "./types";

const cursors = new Map<number, number>();
const artifactPattern = /```([\w+-]+)?(?:\s+([^\n]+))?\n([\s\S]*?)```/g;

function event(runId: string, sequence: number, type: AgentStreamEvent["type"], payload: Record<string, unknown>): AgentStreamEvent {
  return { runId, sequence, type, payload, createdAt: new Date().toISOString() };
}

function orderedConfigs<T>(ownerId: number, configs: T[]) {
  if (configs.length === 0) return configs;
  const cursor = cursors.get(ownerId) || 0;
  cursors.set(ownerId, (cursor + 1) % configs.length);
  return [...configs.slice(cursor), ...configs.slice(0, cursor)];
}

function recoverable(error: unknown) {
  return error instanceof ProviderRequestError && error.options.recoverable;
}

function titleForArtifact(path: string) {
  const basename = path.trim().split("/").pop();
  return basename || "artifact.txt";
}

function previewMode(language: string): "none" | "html" | "react" {
  if (language.toLowerCase() === "html") return "html";
  if (["tsx", "jsx"].includes(language.toLowerCase())) return "react";
  return "none";
}

async function* demoResponse(runId: string, emit: (type: AgentStreamEvent["type"], payload: Record<string, unknown>) => Promise<AgentStreamEvent>, prompt: string) {
  const copy = `Nenhum provedor configurado ainda. O Lunex está em modo demonstração seguro. Posso estruturar o trabalho e preparar artefatos; adicione uma chave em Configurações para respostas de IA reais.\n\nPedido recebido: **${prompt.slice(0, 240)}**`;
  for (const word of copy.split(/(\s+)/)) {
    if (word) yield await emit("text.delta", { delta: word, source: "demo" });
  }
}

export async function* runAgent(input: { ownerId: number; projectId: string; conversationId: string; prompt: string }): AsyncGenerator<AgentStreamEvent> {
  const runId = await db.createAgentRun(input.ownerId, { projectId: input.projectId, conversationId: input.conversationId });
  let sequence = 0;
  const emit = async (type: AgentStreamEvent["type"], payload: Record<string, unknown>) => {
    const next = event(runId, ++sequence, type, payload);
    await db.appendRunEvent(input.ownerId, { runId, projectId: input.projectId, sequence: next.sequence, type, payload });
    return next;
  };

  try {
    await db.createMessage(input.ownerId, {
      projectId: input.projectId,
      conversationId: input.conversationId,
      role: "user",
      content: input.prompt,
    });
    await db.updateAgentRun(input.ownerId, runId, { status: "running", startedAt: new Date() });
    yield await emit("run.started", { projectId: input.projectId, conversationId: input.conversationId });

    yield await emit("tool.started", { tool: "project_context", label: "Lendo os artefatos do projeto" });
    const artifacts = await db.listArtifacts(input.ownerId, input.projectId);
    yield await emit("tool.completed", { tool: "project_context", artifactCount: artifacts.length });
    const history = await db.listMessages(input.ownerId, input.conversationId);
    const messages: AgentInputMessage[] = [
      {
        role: "system",
        content:
          "Você é Lunex, um agente de desenvolvimento. Seja objetivo, explique decisões importantes e coloque código gerado em blocos cercados por três crases com linguagem e caminho de arquivo, por exemplo: ```tsx src/App.tsx. Não exponha segredos.",
      },
      ...(artifacts.length
        ? [{ role: "system" as const, content: `Artefatos existentes no projeto: ${artifacts.map(artifact => `${artifact.filePath} (${artifact.language})`).join(", ")}.` }]
        : []),
      ...history.filter(message => ["user", "assistant"].includes(message.role)).map(message => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
    ];

    const candidates = orderedConfigs(input.ownerId, await db.listRoutableProviders(input.ownerId, "text"));
    let generated = "";
    let delivered = false;

    if (candidates.length === 0) {
      yield await emit("provider.selected", { mode: "demo", reason: "Nenhum provedor de texto habilitado" });
      for await (const output of demoResponse(runId, emit, input.prompt)) {
        generated += String(output.payload.delta || "");
        yield output;
      }
      delivered = true;
    }

    for (const candidate of candidates) {
      if (delivered) break;
      const config: DecryptedProviderConfig = { ...candidate, apiKey: decryptProviderSecret(candidate.apiKeyCiphertext) };
      try {
        yield await emit("provider.selected", { configId: config.id, provider: config.provider, model: config.model });
        await db.updateAgentRun(input.ownerId, runId, { providerConfigId: config.id, model: config.model });
        for await (const delta of streamTextProvider(config, messages)) {
          if (delta.thinking) yield await emit("thinking.delta", { delta: delta.thinking });
          if (delta.text) {
            generated += delta.text;
            yield await emit("text.delta", { delta: delta.text });
          }
        }
        await db.recordProviderSuccess(input.ownerId, config.id);
        delivered = true;
      } catch (error) {
        await db.recordProviderFailure(input.ownerId, config.id);
        yield await emit("run.failed", {
          recoverable: recoverable(error),
          provider: config.provider,
          message: error instanceof Error ? error.message : "Falha desconhecida do provedor.",
        });
        if (!recoverable(error)) throw error;
      }
    }

    if (!delivered) throw new Error("Nenhum provedor conseguiu atender à solicitação.");

    await db.createMessage(input.ownerId, {
      projectId: input.projectId,
      conversationId: input.conversationId,
      role: "assistant",
      content: generated,
    });

    artifactPattern.lastIndex = 0;
    for (const match of Array.from(generated.matchAll(artifactPattern))) {
      const language = match[1] || "text";
      const filePath = match[2]?.trim() || `artifacts/generated-${Date.now()}.${language}`;
      const content = match[3] || "";
      const artifact = await db.createArtifact(input.ownerId, {
        projectId: input.projectId,
        conversationId: input.conversationId,
        title: titleForArtifact(filePath),
        filePath,
        language,
        kind: language === "html" ? "html" : "code",
        content,
        previewMode: previewMode(language),
        summary: "Artefato extraído da resposta do agente",
      });
      if (artifact) yield await emit("artifact.detected", { artifactId: artifact.id, filePath, language, previewMode: artifact.previewMode });
    }

    await db.updateAgentRun(input.ownerId, runId, { status: "completed", completedAt: new Date() });
    yield await emit("run.completed", { messageLength: generated.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida na execução do agente.";
    await db.updateAgentRun(input.ownerId, runId, { status: "failed", errorCode: "AGENT_RUN_FAILED", errorMessage: message, completedAt: new Date() });
    await notifyOwner({ title: "Falha crítica no motor do Lunex", content: `Execução ${runId} no projeto ${input.projectId}: ${message}` }).catch(() => false);
    yield await emit("run.failed", { recoverable: false, message });
  }
}
