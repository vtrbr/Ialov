# Evidência de desempenho da revisão de interface

## Objetivo

A revisão inspirada na experiência de chat do Claude prioriza a tela de conversa e posterga o carregamento do workspace de artefatos até que o usuário o abra. Isso reduz o JavaScript inicial sem retirar edição, histórico, diff ou preview.

## Medição de produção

| Métrica | Antes da separação | Depois da separação | Resultado |
|---|---:|---:|---:|
| JavaScript inicial minificado | 758,41 kB | 712,41 kB | **−46,00 kB (−6,06%)** |
| JavaScript inicial comprimido | 217,91 kB | 210,16 kB | **−7,75 kB** |
| Chunk do workspace de artefatos | Integrado ao bundle inicial | 27,56 kB / 6,95 kB gzip | Carregado sob demanda |
| Chunk de configurações | Integrado ao bundle inicial | 22,67 kB / 3,47 kB gzip | Carregado sob demanda |

Os números foram obtidos com `pnpm build` em 14 de agosto de 2026. `ArtifactWorkspace` e `SettingsPanel` são importados com `React.lazy` e só são solicitados quando os respectivos painéis são abertos.

> O Vite continua emitindo uma recomendação de code-splitting para o bundle principal, mas a redução acima é real e não alterou o comportamento nem a cobertura de testes. Futuras otimizações podem separar outras áreas pouco frequentes caso o produto cresça.
