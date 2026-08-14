import { nanoid } from "nanoid";
import * as db from "../db";
import { storagePut } from "../storage";
import { decryptProviderSecret } from "./crypto";
import { ProviderRequestError } from "./types";

function endpoint(config: { baseUrl: string | null }) {
  return `${(config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/images/generations`;
}

export async function generateImageForProject(input: { ownerId: number; projectId: string; conversationId?: string; prompt: string; size?: "1024x1024" | "1024x1536" | "1536x1024" }) {
  const candidates = await db.listRoutableProviders(input.ownerId, "image");
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      if (!["openai", "compatible"].includes(candidate.provider)) {
        throw new ProviderRequestError("O provedor de imagem atual não possui adaptador compatível configurado.", { recoverable: true, provider: candidate.provider });
      }
      const apiKey = decryptProviderSecret(candidate.apiKeyCiphertext);
      const response = await fetch(endpoint(candidate), {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model: candidate.model, prompt: input.prompt, size: input.size || "1024x1024", response_format: "b64_json" }),
      });
      if (!response.ok) {
        const recoverable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new ProviderRequestError(`Falha de imagem do provedor (${response.status}).`, { status: response.status, recoverable, provider: candidate.provider });
      }
      const result = (await response.json()) as { data?: Array<{ b64_json?: string; revised_prompt?: string }> };
      const base64 = result.data?.[0]?.b64_json;
      if (!base64) throw new ProviderRequestError("O provedor não retornou uma imagem utilizável.", { recoverable: true, provider: candidate.provider });
      const image = await storagePut(`lunex/generated/${input.projectId}/${nanoid(10)}.png`, Buffer.from(base64, "base64"), "image/png");
      await db.recordProviderSuccess(input.ownerId, candidate.id);
      const artifact = await db.createArtifact(input.ownerId, {
        projectId: input.projectId,
        conversationId: input.conversationId,
        title: "Imagem gerada pelo Lunex",
        filePath: image.key,
        language: "image/png",
        kind: "image_prompt",
        content: image.url,
        previewMode: "none",
        summary: result.data?.[0]?.revised_prompt || input.prompt.slice(0, 320),
      });
      return { url: image.url, artifactId: artifact?.id, prompt: result.data?.[0]?.revised_prompt || input.prompt };
    } catch (error) {
      lastError = error;
      await db.recordProviderFailure(input.ownerId, candidate.id);
      if (!(error instanceof ProviderRequestError) || !error.options.recoverable) break;
    }
  }
  throw lastError || new Error("Nenhum provedor de imagem habilitado foi encontrado.");
}
