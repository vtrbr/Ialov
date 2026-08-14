export type SseFrameResult = { events: unknown[]; remaining: string };

/** Separa frames SSE completos sem perder dados que chegaram em chunks parciais. */
export function extractSseEvents(buffer: string): SseFrameResult {
  const normalized = buffer.replace(/\r/g, "");
  const frames = normalized.split("\n\n");
  const remaining = frames.pop() || "";
  const events: unknown[] = [];

  for (const frame of frames) {
    const data = frame
      .split("\n")
      .filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data));
    } catch {
      // Eventos malformados não interrompem a resposta do agente.
    }
  }

  return { events, remaining };
}
