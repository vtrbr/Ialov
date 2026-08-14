# Notas de streaming dos provedores

O motor do Lunex 1.2 expõe um protocolo interno de eventos baseado em SSE, independente do fornecedor: `run.started`, `thinking.delta`, `text.delta`, `tool.started`, `tool.completed`, `artifact.detected`, `run.completed` e `run.failed`. Os adaptadores de provedor jamais enviam chaves ou respostas brutas ao navegador; eles convertem a resposta upstream no servidor.

| Provedor | Observação de compatibilidade | Decisão do Lunex |
| --- | --- | --- |
| OpenAI | A API Responses admite `stream=true` e envia eventos semânticos por SSE. | Converter eventos textuais, de tool-call e de conclusão no protocolo interno. |
| Google Gemini | A Interactions API admite streaming e também transmite eventos por SSE, incluindo eventos de etapa e delta. | Converter deltas de etapa e texto no mesmo protocolo interno, sem acoplar a interface ao formato do Gemini. |
| Anthropic | Será atendido por adaptador dedicado com normalização equivalente antes de ser ativado por credencial. | Manter o contrato interno e os testes independentes do formato externo. |

> O modo de demonstração reproduz o mesmo protocolo de eventos localmente quando não há provedor configurado. Isso preserva o funcionamento da experiência e evita chamadas de IA sem uma chave válida.

## Fontes técnicas

1. [OpenAI — Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses).
2. [Google Gemini — Streaming interactions](https://ai.google.dev/gemini-api/docs/streaming).
