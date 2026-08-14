import type { ProviderConfig } from "../../drizzle/schema";

export type AgentInputMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AgentStreamEvent = {
  runId: string;
  sequence: number;
  type:
    | "run.started"
    | "provider.selected"
    | "thinking.delta"
    | "text.delta"
    | "tool.started"
    | "tool.completed"
    | "artifact.detected"
    | "run.completed"
    | "run.failed";
  payload: Record<string, unknown>;
  createdAt: string;
};

export type DecryptedProviderConfig = ProviderConfig & { apiKey: string };

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly options: { status?: number; recoverable: boolean; provider: string }
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}
