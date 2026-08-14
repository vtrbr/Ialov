# Configuração do Firebase e regras do Firestore — Lunex 1.2

O Lunex 1.2 mantém suas chaves de provedores de IA exclusivamente no servidor. O Firebase deve receber **identidades e dados de trabalho**, nunca chaves de API, credenciais de service account, registros brutos de requisições a provedores ou segredos de sessão. O arquivo [`firestore.rules`](../firestore.rules) é o conjunto de regras pronto para publicação inicial.

> As regras do Cloud Firestore avaliam cada requisição proveniente de clientes web/mobile antes de uma leitura ou escrita. O SDK Admin no backend é confiável e não é sujeito a essas regras; por isso, ele deve continuar protegido por controles de servidor e nunca ser exposto ao navegador.[1]

| Camada | Responsabilidade no Lunex | Pode estar no cliente? |
|---|---|---|
| Firebase Authentication | Emite o `uid` do usuário e administra os provedores de login. | Sim, por meio do SDK Firebase Auth. |
| Firestore | Armazena projetos, conversas, mensagens, artefatos e versões por usuário. | Sim, obedecendo `firestore.rules`. |
| Backend do Lunex | Executa agentes, roteia provedores, cifra chaves, salva eventos e cria checkpoints confiáveis. | **Não**. |
| Firebase Admin SDK | Migra dados e grava documentos de servidor, como eventos e versões. | **Não**; somente em variáveis de ambiente do backend. |

## 1. Estrutura de dados recomendada

Para evitar consultas que precisam de permissões cruzadas e manter o isolamento legível, a migração para Firestore usa subcoleções de cada identidade Firebase.

```text
users/{uid}
├── projects/{projectId}
│   ├── conversations/{conversationId}
│   │   └── messages/{messageId}
│   ├── artifacts/{artifactId}
│   │   └── versions/{versionId}
│   └── agentRuns/{runId}
│       └── events/{eventId}
└── settings/private
```

Cada documento pertencente ao usuário está abaixo de `users/{uid}`. A regra `owns(userId)` compara o segmento da rota com `request.auth.uid`, de modo que uma identidade autenticada só lê ou grava a própria árvore. Essa abordagem também elimina a necessidade de confiar em um `ownerId` enviado pelo cliente.

| Coleção | Escrita pelo cliente | Escrita pelo backend | Observação |
|---|---:|---:|---|
| `projects`, `conversations`, `artifacts` | Sim, com validação de tipo, tamanho e caminho. | Sim. | Permite edição manual. |
| `messages` | Apenas mensagens com `role == "user"`. | Sim. | Respostas do agente não podem ser forjadas no navegador. |
| `versions`, `agentRuns`, `events` | Não. | Sim. | Protege checkpoints e telemetria. |
| `settings/private` | Apenas preferências sem segredo. | Sim. | **Nunca** inclua API keys. |

## 2. Publicar as regras

No Firebase Console, crie o banco Cloud Firestore em **Native mode**, abra **Firestore Database → Rules**, substitua o conteúdo pelo arquivo [`firestore.rules`](../firestore.rules) e publique. O Firebase recomenda testar no simulador antes da publicação; o simulador aceita requisições autenticadas e não autenticadas sem tocar na base real.[1]

Para controle de versão, a alternativa é usar a CLI do Firebase:

```bash
firebase init firestore
# aponte firestore.rules para ../firestore.rules ou copie o arquivo para o diretório configurado
firebase deploy --only firestore
```

Após uma alteração, novas consultas normalmente passam a usar as regras em até um minuto, enquanto listeners existentes podem levar mais tempo para refletir a atualização.[1]

## 3. Configurar Firebase Authentication

Ative os provedores de login que serão usados pelo produto — por exemplo, Google e email/senha — em **Authentication → Sign-in method**. Depois, registre a configuração pública web no frontend apenas quando a migração for ativada. A configuração pública do Firebase não equivale a uma chave administrativa, mas continua sendo recomendável restringir domínios autorizados e as chaves de API no Google Cloud Console.

O backend atual mantém a sessão da plataforma e armazena um vínculo opcional `firebaseUid`. Na etapa de migração, o backend deve verificar o ID token do Firebase com o Admin SDK, associar `request.auth.uid` a `firebaseUid` e então ler/gravar sob `users/{uid}`. O login novo deve ser liberado somente depois desse vínculo estar validado em ambiente de teste.

## 4. Variáveis de ambiente futuras

Não crie ou preencha estas variáveis no navegador. Ao conectar o Firebase, elas devem ser cadastradas como segredos do servidor.

| Variável | Onde usar | Conteúdo |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Backend | ID do projeto Firebase. |
| `FIREBASE_CLIENT_EMAIL` | Backend | E-mail da service account. |
| `FIREBASE_PRIVATE_KEY` | Backend | Chave privada da service account, preservando quebras de linha. |
| `FIREBASE_STORAGE_BUCKET` | Backend | Bucket de Storage, se for usado. |
| `VITE_FIREBASE_*` | Frontend, apenas ao ativar o SDK | Configuração pública do app web; nunca a service account. |

As cinco chaves de IA do Lunex são configuradas no painel **Configurações** e são cifradas no servidor. O frontend recebe somente indicador de configuração e fingerprint parcial; não recebe texto de chave nem ciphertext.

## 5. Casos mínimos para testar no simulador

| Cenário | Resultado esperado |
|---|---|
| Sem `request.auth` tentando ler qualquer projeto | Negado. |
| Usuário A lendo `users/A/projects/x` | Permitido. |
| Usuário A lendo ou gravando `users/B/projects/x` | Negado. |
| Usuário A criando mensagem `role: "assistant"` | Negado. |
| Usuário A gravando uma versão ou execução de agente | Negado. |
| Backend com Admin SDK salvando versão/evento | Permitido pelo backend; validar autorização no próprio servidor. |
| Caminho de artefato contendo `../` | Negado. |

As regras não filtram resultados de consulta: toda consulta feita pelo cliente precisa ser compatível com a condição que a protege, ou será recusada. A modelagem aninhada acima permite que os clientes consultem apenas caminhos onde o `uid` já faz parte da rota.[2]

## 6. Limites e operação segura

As funções `get()`, `exists()` e `getAfter()` nas regras consomem leituras e possuem limites por avaliação; o arquivo proposto evita dependências entre documentos no fluxo normal para não adicionar esse custo e complexidade.[2] Para mudanças futuras, mantenha `rules_version = '2'`, teste a alteração no simulador, publique primeiro em ambiente de desenvolvimento e só então replique em produção.

## Referências

[1]: https://firebase.google.com/docs/firestore/security/get-started "Get started with Cloud Firestore Security Rules — Firebase"
[2]: https://firebase.google.com/docs/firestore/security/rules-conditions "Writing conditions for Cloud Firestore Security Rules — Firebase"
