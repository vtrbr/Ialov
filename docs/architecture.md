# Arquitetura do Lunex 1.2

O Lunex 1.2 é dividido em uma aplicação web com API tipada, uma camada de persistência relacional e uma camada de adaptadores externos. A interface nunca conhece chaves de provedores, credenciais de Firebase nem detalhes de execução do agente. Ela consome apenas procedimentos autenticados e eventos normalizados do backend.

| Camada | Responsabilidade | Garantia principal |
| --- | --- | --- |
| Interface React | Chat, artefatos, preview, versões e configurações. | Não recebe segredos nem chama provedores diretamente. |
| API do Lunex | Autorização, orquestração, streaming de eventos e validação. | Todo recurso é filtrado por proprietário. |
| Cofre de provedores | Guarda a configuração de até quatro rotas de texto e uma rota de imagem. | Segredos são cifrados no servidor e retornam apenas como estado configurado. |
| Adaptadores de IA | OpenAI, Anthropic, Gemini e endpoints compatíveis. | Convertem formatos de cada fornecedor em eventos internos. |
| Persistência | Projetos, conversas, mensagens, artefatos, versões e execuções. | Estrutura relacional pensada para espelhar coleções do Firestore. |
| Executor de artefatos | Preview isolado no navegador e integração futura com sandbox remoto. | Código de artefato não executa com privilégios do servidor da plataforma. |

## Contratos de segurança

As configurações de fornecedores pertencem à conta administrativa da plataforma. A chave entra por uma chamada HTTPS autenticada, é cifrada com uma chave derivada de segredo exclusivamente do servidor e nunca é incluída em consultas, logs ou respostas tRPC. As rotas do agente recebem somente a configuração já decifrada no processo servidor.

Cada registro de domínio contém `userId`, mesmo quando é alcançável por meio de `projectId` ou `conversationId`. Essa duplicação intencional simplifica filtros de propriedade no MySQL e será preservada como `ownerId` em documentos Firestore futuros.

Operações sensíveis usam confirmação de intenção: publicar configurações Firebase, restaurar uma versão, remover conteúdo e acionar deploy ficam separadas das alterações normais de artefato. O MVP registra essas intenções como eventos auditáveis; conectores de deploy e de sandbox somente serão acionados depois de configurados pelo administrador.

## Limitações de execução do MVP

O backend atual é um único processo Node gerenciado, adequado para procedimentos curtos, streaming HTTP e persistência de estado no banco. Ele não deve executar comandos arbitrários, compilar projetos de terceiros ou manter processos de preview por longos períodos dentro do próprio servidor, pois isso comprometeria isolamento e previsibilidade operacional. O preview inicial é intencionalmente restrito a um iframe sandboxado no navegador; uma execução completa de projetos React, instalações de dependências, navegador automatizado e portas públicas exigirá um provedor externo de sandbox isolado, como E2B ou equivalente, configurado depois pelo administrador.

O streaming do Lunex funciona enquanto a solicitação HTTP permanece aberta. Filas de longa duração, colaboração via conexão persistente e reconstrução de sandboxes não são iniciadas no MVP sem infraestrutura própria. A integração real depende de credenciais de IA, de imagem e, opcionalmente, Firebase; sem elas, o produto mantém um modo de demonstração local e não envia dados a fornecedores externos. O deploy de artefatos permanece uma intenção confirmável até que um destino e credenciais de publicação sejam definidos.

## Roteamento de IA

O registro de configuração tem cinco posições lógicas: quatro rotas de texto e uma rota de imagem. Cada rota possui fornecedor, modelo, prioridade, estado habilitado e segredo cifrado. Para pedidos de texto, o roteador escolhe as rotas habilitadas em prioridade crescente, inicia pelo cursor de round-robin e tenta a rota seguinte somente para falhas recuperáveis, como limite temporário, indisponibilidade ou erro de gateway. Erros de autenticação e validação não são repetidos em outra rota sem registrar diagnóstico.

O backend traduz respostas upstream em SSE interno. OpenAI documenta streaming semântico por SSE para a Responses API, e o Gemini documenta eventos de interação e etapas no mesmo transporte; por isso a interface não depende do formato de nenhum fornecedor.[1] [2]

## Caminho de migração para Firebase

| Tabela do MVP | Coleção Firestore futura | Chave de propriedade | Subcoleção recomendada |
| --- | --- | --- | --- |
| `projects` | `projects` | `ownerId` | `conversations`, `artifacts`, `runs` |
| `conversations` | `projects/{projectId}/conversations` | `ownerId` | `messages` |
| `messages` | `projects/{projectId}/conversations/{conversationId}/messages` | `ownerId` | — |
| `artifacts` | `projects/{projectId}/artifacts` | `ownerId` | `versions` |
| `artifactVersions` | `projects/{projectId}/artifacts/{artifactId}/versions` | `ownerId` | — |
| `agentRuns` | `projects/{projectId}/runs` | `ownerId` | `events` |
| `providerConfigs` | `platformSettings/providerConfigs` | `adminId` | — |

## Referências

[1] [OpenAI — Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses)

[2] [Google Gemini — Streaming interactions](https://ai.google.dev/gemini-api/docs/streaming)
