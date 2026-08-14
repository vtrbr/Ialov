import { ProviderRequestError, type AgentInputMessage, type DecryptedProviderConfig } from "./types";

type TextDelta = { text: string; thinking?: string };

function normalizedBaseUrl(baseUrl: string | null, fallback: string) {
  return (baseUrl || fallback).replace(/\/$/, "");
}

function messagesForChat(messages: AgentInputMessage[]) {
  return messages.filter(message => message.role !== "system").map(message => ({ role: message.role, content: message.content }));
}

async function assertResponse(response: Response, provider: string) {
  if (response.ok) return;
  const recoverable = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
  throw new ProviderRequestError(`O provedor ${provider} recusou a solicitação (${response.status}).`, {
    status: response.status,
    recoverable,
    provider,
  });
}

async function* ssePayloads(response: Response) {
  if (!response.body) throw new ProviderRequestError("A resposta do provedor não possui stream.", { recoverable: true, provider: "unknown" });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const data = frame
        .split(/\r?\n/)
        .filter(line => line.startsWith("data:"))
        .map(line => line.slice(5).trim())
        .join("\n");
      if (data && data !== "[DONE]") yield data;
    }
    if (done) break;
  }
}

async function* openAiStream(config: DecryptedProviderConfig, messages: AgentInputMessage[]): AsyncGenerator<TextDelta> {
  const endpoint = normalizedBaseUrl(config.baseUrl, "https://api.openai.com/v1") + "/responses";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ model: config.model, stream: true, input: messages.map(message => ({ role: message.role, content: message.content })) }),
  });
  await assertResponse(response, "openai");
  for await (const payload of ssePayloads(response)) {
    try {
      const event = JSON.parse(payload) as { type?: string; delta?: string };
      if (event.type === "response.output_text.delta" && event.delta) yield { text: event.delta };
    } catch {
      // Eventos não JSON não fazem parte do contrato normalizado do Lunex.
    }
  }
}

async function* anthropicStream(config: DecryptedProviderConfig, messages: AgentInputMessage[]): AsyncGenerator<TextDelta> {
  const endpoint = normalizedBaseUrl(config.baseUrl, "https://api.anthropic.com") + "/v1/messages";
  const system = messages.find(message => message.role === "system")?.content;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      accept: "text/event-stream",
    },
    body: JSON.stringify({ model: config.model, max_tokens: 4096, stream: true, system, messages: messagesForChat(messages) }),
  });
  await assertResponse(response, "anthropic");
  for await (const payload of ssePayloads(response)) {
    try {
      const event = JSON.parse(payload) as { type?: string; delta?: { text?: string; thinking?: string } };
      if (event.type === "content_block_delta" && event.delta?.text) yield { text: event.delta.text };
      if (event.type === "content_block_delta" && event.delta?.thinking) yield { text: "", thinking: event.delta.thinking };
    } catch {
      // Ignora keep-alives e eventos fora do escopo de texto.
    }
  }
}

async function* geminiStream(config: DecryptedProviderConfig, messages: AgentInputMessage[]): AsyncGenerator<TextDelta> {
  const base = normalizedBaseUrl(config.baseUrl, "https://generativelanguage.googleapis.com/v1beta");
  const endpoint = `${base}/models/${encodeURIComponent(config.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.apiKey)}`;
  const system = messages.find(message => message.role === "system")?.content;
  const contents = messagesForChat(messages).map(message => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents }),
  });
  await assertResponse(response, "gemini");
  for await (const payload of ssePayloads(response)) {
    try {
      const event = JSON.parse(payload) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = event.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
      if (text) yield { text };
    } catch {
      // Ignora frames de controle.
    }
  }
}

async function* compatibleStream(config: DecryptedProviderConfig, messages: AgentInputMessage[]): AsyncGenerator<TextDelta> {
  if (!config.baseUrl) throw new ProviderRequestError("Um endpoint base é obrigatório para provedor compatível.", { recoverable: false, provider: "compatible" });
  const endpoint = normalizedBaseUrl(config.baseUrl, "") + "/chat/completions";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ model: config.model, stream: true, messages }),
  });
  await assertResponse(response, "compatible");
  for await (const payload of ssePayloads(response)) {
    try {
      const event = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }> };
      const delta = event.choices?.[0]?.delta;
      if (delta?.content || delta?.reasoning_content) yield { text: delta.content || "", thinking: delta.reasoning_content };
    } catch {
      // Ignora frames de controle.
    }
  }
}

export async function* streamTextProvider(config: DecryptedProviderConfig, messages: AgentInputMessage[]) {
  if (config.provider === "openai") yield* openAiStream(config, messages);
  else if (config.provider === "anthropic") yield* anthropicStream(config, messages);
  else if (config.provider === "gemini") yield* geminiStream(config, messages);
  else yield* compatibleStream(config, messages);
}
