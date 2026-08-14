import { describe, expect, it } from "vitest";
import { extractSseEvents } from "./agentStream";

describe("extractSseEvents", () => {
  it("lê múltiplos eventos completos e preserva o frame parcial", () => {
    const result = extractSseEvents('event: agent\ndata: {"type":"text.delta","payload":{"delta":"Olá"}}\n\ndata: {"type":"run.completed","payload":{}}\n\ndata: {"type":"text');

    expect(result.events).toEqual([
      { type: "text.delta", payload: { delta: "Olá" } },
      { type: "run.completed", payload: {} },
    ]);
    expect(result.remaining).toBe('data: {"type":"text');
  });

  it("ignora JSON inválido sem descartar os próximos eventos", () => {
    const result = extractSseEvents("data: não-json\n\ndata: {\"type\":\"tool.started\",\"payload\":{}}\n\n");

    expect(result.events).toEqual([{ type: "tool.started", payload: {} }]);
  });
});
