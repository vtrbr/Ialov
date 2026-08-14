import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { applyTextPatches, lineDiff } from "../artifacts/diff";
import { protectedProcedure, router } from "../_core/trpc";

const projectId = z.string().min(8).max(32);
const artifactKind = z.enum(["code", "html", "markdown", "image_prompt", "other"]);
const previewMode = z.enum(["none", "html", "react"]);

function databaseFailure(error: unknown): never {
  console.error("[Studio] Operação persistente falhou:", error);
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a operação no estúdio." });
}

export const studioRouter = router({
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.listProjects(ctx.user.id);
      } catch (error) {
        return databaseFailure(error);
      }
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(2000).optional(), template: z.string().max(80).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.createProject(ctx.user.id, input);
        } catch (error) {
          return databaseFailure(error);
        }
      }),
    get: protectedProcedure.input(z.object({ projectId })).query(async ({ ctx, input }) => {
      try {
        const project = await db.getProject(ctx.user.id, input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado." });
        return project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseFailure(error);
      }
    }),
  }),
  conversations: router({
    list: protectedProcedure.input(z.object({ projectId })).query(async ({ ctx, input }) => {
      try {
        return await db.listConversations(ctx.user.id, input.projectId);
      } catch (error) {
        return databaseFailure(error);
      }
    }),
    create: protectedProcedure
      .input(z.object({ projectId, title: z.string().trim().min(1).max(180) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.createConversation(ctx.user.id, input);
        } catch (error) {
          return databaseFailure(error);
        }
      }),
    messages: protectedProcedure.input(z.object({ conversationId: projectId })).query(async ({ ctx, input }) => {
      try {
        const conversation = await db.getConversation(ctx.user.id, input.conversationId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada." });
        return await db.listMessages(ctx.user.id, input.conversationId);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseFailure(error);
      }
    }),
  }),
  artifacts: router({
    list: protectedProcedure.input(z.object({ projectId })).query(async ({ ctx, input }) => {
      try {
        return await db.listArtifacts(ctx.user.id, input.projectId);
      } catch (error) {
        return databaseFailure(error);
      }
    }),
    get: protectedProcedure.input(z.object({ artifactId: projectId })).query(async ({ ctx, input }) => {
      try {
        const artifact = await db.getArtifact(ctx.user.id, input.artifactId);
        if (!artifact) throw new TRPCError({ code: "NOT_FOUND", message: "Artefato não encontrado." });
        return artifact;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseFailure(error);
      }
    }),
    create: protectedProcedure
      .input(
        z.object({
          projectId,
          conversationId: projectId.optional(),
          title: z.string().trim().min(1).max(180),
          filePath: z.string().trim().min(1).max(320),
          language: z.string().trim().min(1).max(48).optional(),
          kind: artifactKind.optional(),
          content: z.string().max(450_000),
          previewMode: previewMode.optional(),
          summary: z.string().trim().max(320).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.createArtifact(ctx.user.id, input);
        } catch (error) {
          return databaseFailure(error);
        }
      }),
    versions: protectedProcedure.input(z.object({ artifactId: projectId })).query(async ({ ctx, input }) => {
      try {
        const artifact = await db.getArtifact(ctx.user.id, input.artifactId);
        if (!artifact) throw new TRPCError({ code: "NOT_FOUND", message: "Artefato não encontrado." });
        return await db.listArtifactVersions(ctx.user.id, input.artifactId);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return databaseFailure(error);
      }
    }),
    update: protectedProcedure
      .input(z.object({ artifactId: projectId, content: z.string().max(450_000), summary: z.string().trim().min(1).max(320), patchJson: z.string().max(100_000).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.updateArtifact(ctx.user.id, { ...input, operation: "edit" });
        } catch (error) {
          return databaseFailure(error);
        }
      }),
    applyPatch: protectedProcedure
      .input(
        z.object({
          artifactId: projectId,
          baseVersion: z.number().int().positive(),
          summary: z.string().trim().min(1).max(320),
          patches: z.array(z.object({ start: z.number().int().min(0), end: z.number().int().min(0), replacement: z.string().max(200_000) })).min(1).max(100),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const artifact = await db.getArtifact(ctx.user.id, input.artifactId);
          if (!artifact) throw new TRPCError({ code: "NOT_FOUND", message: "Artefato não encontrado." });
          if (artifact.version !== input.baseVersion) {
            throw new TRPCError({ code: "CONFLICT", message: "O artefato foi atualizado; recarregue antes de aplicar a alteração." });
          }
          const content = applyTextPatches(artifact.content, input.patches);
          return await db.updateArtifact(ctx.user.id, {
            artifactId: input.artifactId,
            content,
            summary: input.summary,
            patchJson: JSON.stringify(input.patches),
            operation: "edit",
          });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return databaseFailure(error);
        }
      }),
    restore: protectedProcedure
      .input(z.object({ artifactId: projectId, version: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const versions = await db.listArtifactVersions(ctx.user.id, input.artifactId);
          const version = versions.find(item => item.version === input.version);
          if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada." });
          return await db.updateArtifact(ctx.user.id, {
            artifactId: input.artifactId,
            content: version.content,
            summary: `Restauração da versão ${version.version}`,
            operation: "restore",
          });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return databaseFailure(error);
        }
      }),
    diff: protectedProcedure
      .input(z.object({ artifactId: projectId, beforeVersion: z.number().int().positive(), afterVersion: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          const artifact = await db.getArtifact(ctx.user.id, input.artifactId);
          if (!artifact) throw new TRPCError({ code: "NOT_FOUND", message: "Artefato não encontrado." });
          const versions = await db.listArtifactVersions(ctx.user.id, input.artifactId);
          const before = versions.find(version => version.version === input.beforeVersion);
          const after = versions.find(version => version.version === input.afterVersion);
          if (!before || !after) throw new TRPCError({ code: "NOT_FOUND", message: "Uma das versões não foi encontrada." });
          return { beforeVersion: before.version, afterVersion: after.version, lines: lineDiff(before.content, after.content) };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          return databaseFailure(error);
        }
      }),
  }),
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getPreferences(ctx.user.id);
      } catch (error) {
        return databaseFailure(error);
      }
    }),
    update: protectedProcedure
      .input(
        z.object({
          autonomyMode: z.enum(["ask", "autonomous"]).optional(),
          preferredTextSlot: z.enum(["text_1", "text_2", "text_3", "text_4"]).nullable().optional(),
          firebaseProjectId: z.string().trim().max(160).nullable().optional(),
          firebaseAuthConfigured: z.boolean().optional(),
          firestoreConfigured: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await db.upsertPreferences(ctx.user.id, input);
        } catch (error) {
          return databaseFailure(error);
        }
      }),
  }),
});
