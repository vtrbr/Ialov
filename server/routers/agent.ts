import { z } from "zod";
import * as db from "../db";
import { encryptProviderSecret, keyFingerprint } from "../agent/crypto";
import { generateImageForProject } from "../agent/images";
import { adminProcedure, router } from "../_core/trpc";

const slot = z.enum(["text_1", "text_2", "text_3", "text_4", "image_1"]);
const provider = z.enum(["openai", "anthropic", "gemini", "compatible", "other"]);

function safeProviderConfig(config: Awaited<ReturnType<typeof db.listProviderConfigs>>[number]) {
  return {
    id: config.id,
    slot: config.slot,
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    priority: config.priority,
    enabled: config.enabled,
    apiKeyFingerprint: config.apiKeyFingerprint,
    failureCount: config.failureCount,
    lastFailureAt: config.lastFailureAt,
    lastSuccessAt: config.lastSuccessAt,
    updatedAt: config.updatedAt,
  };
}

export const agentRouter = router({
  providers: router({
    list: adminProcedure.query(async ({ ctx }) => (await db.listProviderConfigs(ctx.user.id)).map(safeProviderConfig)),
    save: adminProcedure
      .input(
        z.object({
          slot,
          provider,
          model: z.string().trim().min(1).max(160),
          baseUrl: z.string().url().nullable().optional(),
          apiKey: z.string().trim().min(8).max(1_000),
          priority: z.number().int().min(0).max(100),
          enabled: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const stored = await db.upsertProviderConfig(ctx.user.id, {
          ...input,
          baseUrl: input.baseUrl || null,
          apiKeyCiphertext: encryptProviderSecret(input.apiKey),
          apiKeyFingerprint: keyFingerprint(input.apiKey),
        });
        return stored ? safeProviderConfig(stored) : null;
      }),
    setEnabled: adminProcedure
      .input(z.object({ slot, enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.setProviderEnabled(ctx.user.id, input.slot, input.enabled);
        return { success: true } as const;
      }),
  }),
  images: router({
    generate: adminProcedure
      .input(
        z.object({
          projectId: z.string().min(8).max(32),
          conversationId: z.string().min(8).max(32).optional(),
          prompt: z.string().trim().min(3).max(4_000),
          size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional(),
        })
      )
      .mutation(({ ctx, input }) => generateImageForProject({ ownerId: ctx.user.id, ...input })),
  }),
});
