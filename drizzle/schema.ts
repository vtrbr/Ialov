import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Identidade local da plataforma, vinculada à sessão persistente. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  /** UID opcional, preenchido apenas após o vínculo seguro com Firebase Auth. */
  firebaseUid: varchar("firebaseUid", { length: 128 }),
  firebaseLinkedAt: timestamp("firebaseLinkedAt"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [uniqueIndex("users_firebase_uid_unique").on(table.firebaseUid)]);

export const projects = mysqlTable(
  "projects",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    template: varchar("template", { length: 80 }).default("blank").notNull(),
    previewUrl: text("previewUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("projects_owner_idx").on(table.ownerId, table.updatedAt)]
);

export const conversations = mysqlTable(
  "conversations",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    projectId: varchar("projectId", { length: 32 }).notNull(),
    ownerId: int("ownerId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("conversations_project_idx").on(table.projectId, table.ownerId, table.updatedAt)]
);

export const messages = mysqlTable(
  "messages",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    projectId: varchar("projectId", { length: 32 }).notNull(),
    conversationId: varchar("conversationId", { length: 32 }).notNull(),
    ownerId: int("ownerId").notNull(),
    role: mysqlEnum("role", ["system", "user", "assistant", "tool"]).notNull(),
    kind: mysqlEnum("kind", ["message", "thinking", "tool_call", "tool_result", "error"]).default("message").notNull(),
    content: text("content").notNull(),
    metadataJson: text("metadataJson"),
    isFinal: boolean("isFinal").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("messages_conversation_idx").on(table.conversationId, table.ownerId, table.createdAt)]
);

export const artifacts = mysqlTable(
  "artifacts",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    projectId: varchar("projectId", { length: 32 }).notNull(),
    conversationId: varchar("conversationId", { length: 32 }),
    ownerId: int("ownerId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    filePath: varchar("filePath", { length: 320 }).notNull(),
    language: varchar("language", { length: 48 }).default("text").notNull(),
    kind: mysqlEnum("kind", ["code", "html", "markdown", "image_prompt", "other"]).default("code").notNull(),
    content: text("content").notNull(),
    previewMode: mysqlEnum("previewMode", ["none", "html", "react"]).default("none").notNull(),
    version: int("version").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("artifacts_project_idx").on(table.projectId, table.ownerId, table.updatedAt)]
);

export const artifactVersions = mysqlTable(
  "artifactVersions",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    artifactId: varchar("artifactId", { length: 32 }).notNull(),
    projectId: varchar("projectId", { length: 32 }).notNull(),
    ownerId: int("ownerId").notNull(),
    version: int("version").notNull(),
    operation: mysqlEnum("operation", ["create", "edit", "restore"]).notNull(),
    summary: varchar("summary", { length: 320 }).notNull(),
    content: text("content").notNull(),
    patchJson: text("patchJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("artifact_versions_unique").on(table.artifactId, table.version),
    index("artifact_versions_owner_idx").on(table.ownerId, table.createdAt),
  ]
);

export const agentRuns = mysqlTable(
  "agentRuns",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    projectId: varchar("projectId", { length: 32 }).notNull(),
    conversationId: varchar("conversationId", { length: 32 }).notNull(),
    ownerId: int("ownerId").notNull(),
    status: mysqlEnum("status", ["queued", "running", "awaiting_confirmation", "completed", "failed", "cancelled"]).default("queued").notNull(),
    providerConfigId: varchar("providerConfigId", { length: 32 }),
    model: varchar("model", { length: 160 }),
    errorCode: varchar("errorCode", { length: 80 }),
    errorMessage: text("errorMessage"),
    metadataJson: text("metadataJson"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("agent_runs_owner_idx").on(table.ownerId, table.createdAt)]
);

export const agentRunEvents = mysqlTable(
  "agentRunEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    runId: varchar("runId", { length: 32 }).notNull(),
    projectId: varchar("projectId", { length: 32 }).notNull(),
    ownerId: int("ownerId").notNull(),
    sequence: int("sequence").notNull(),
    type: varchar("type", { length: 80 }).notNull(),
    payloadJson: text("payloadJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("agent_run_events_unique").on(table.runId, table.sequence),
    index("agent_run_events_owner_idx").on(table.ownerId, table.createdAt),
  ]
);

export const providerConfigs = mysqlTable(
  "providerConfigs",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    ownerId: int("ownerId").notNull(),
    slot: mysqlEnum("slot", ["text_1", "text_2", "text_3", "text_4", "image_1"]).notNull(),
    provider: mysqlEnum("provider", ["openai", "anthropic", "gemini", "compatible", "other"]).notNull(),
    model: varchar("model", { length: 160 }).notNull(),
    baseUrl: text("baseUrl"),
    apiKeyCiphertext: text("apiKeyCiphertext").notNull(),
    apiKeyFingerprint: varchar("apiKeyFingerprint", { length: 24 }).notNull(),
    priority: int("priority").default(0).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    failureCount: int("failureCount").default(0).notNull(),
    lastFailureAt: timestamp("lastFailureAt"),
    lastSuccessAt: timestamp("lastSuccessAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("provider_configs_slot_unique").on(table.ownerId, table.slot),
    index("provider_configs_routing_idx").on(table.ownerId, table.enabled, table.priority),
  ]
);

export const userPreferences = mysqlTable(
  "userPreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    autonomyMode: mysqlEnum("autonomyMode", ["ask", "autonomous"]).default("ask").notNull(),
    preferredTextSlot: varchar("preferredTextSlot", { length: 16 }),
    firebaseProjectId: varchar("firebaseProjectId", { length: 160 }),
    firebaseAuthConfigured: boolean("firebaseAuthConfigured").default(false).notNull(),
    firestoreConfigured: boolean("firestoreConfigured").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("user_preferences_owner_unique").on(table.ownerId)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type ArtifactVersion = typeof artifactVersions.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type ProviderConfig = typeof providerConfigs.$inferSelect;
