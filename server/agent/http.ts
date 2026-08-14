import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sdk } from "../_core/sdk";
import { runAgent } from "./engine";

const bodySchema = z.object({
  projectId: z.string().min(8).max(32),
  conversationId: z.string().min(8).max(32),
  prompt: z.string().trim().min(1).max(32_000),
});

function writeEvent(response: Response, event: { type: string; [key: string]: unknown }) {
  response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export function registerAgentRoutes(app: Express) {
  app.post("/api/agent/stream", async (request: Request, response: Response) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "Solicitação inválida." });
      return;
    }
    try {
      const user = await sdk.authenticateRequest(request);
      response.status(200);
      response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.flushHeaders();
      for await (const event of runAgent({ ownerId: user.id, ...parsed.data })) writeEvent(response, event);
      response.end();
    } catch (error) {
      if (!response.headersSent) {
        response.status(401).json({ error: "Sessão inválida ou expirada." });
      } else {
        writeEvent(response, { type: "run.failed", message: error instanceof Error ? error.message : "Erro do agente." });
        response.end();
      }
    }
  });
}
