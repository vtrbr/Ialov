# Validação de onboarding e exportação

Esta verificação registra a revisão realizada após a implementação do assistente de configuração inicial e das exportações do estúdio.

| Área | Evidência | Resultado |
| --- | --- | --- |
| Assistente de configuração | Testes interativos cobrem carregamento, erro, diagnóstico seguro do Firebase, armazenamento da preferência e envio da chave somente à mutação protegida. | Aprovado |
| Exportação | Testes interativos do menu validam as opções Markdown e PDF, abertura controlada e estado pendente. Os testes de fluxo cobrem falhas de criação de URL e de geração PDF, verificando o aviso ao usuário; os testes de download validam Blob, revogação da URL e geração local de PDF. Capturas em 1280 × 720 e 375 × 812 mostram o menu real aberto com as duas opções acionáveis. | Aprovado |
| Desktop | Captura em viewport de 1280 × 720, sem ocultar camadas fixas, confirma o diálogo **Configuração inicial** aberto com as cinco rotas, seletor de provedor, campo de chave e ações. | Aprovado |
| Mobile | Captura em viewport de 375 × 812, sem ocultar camadas fixas, confirma o mesmo diálogo aberto, responsivo e legível, com as etapas, rotas e campo seguro de chave. | Aprovado |

As validações automatizadas não usam uma chave verdadeira. O fluxo testa apenas o contrato protegido: o valor digitado segue para a mutação do servidor e não é renderizado como texto visível na interface. Os arquivos Markdown e PDF são gerados sob demanda no navegador a partir do conteúdo já autorizado pela API.

O ciclo final executou `pnpm check`, `pnpm test` e `pnpm build` com sucesso. A suíte contém **44 testes aprovados em 16 arquivos**, incluindo a cobertura de interface. O build mantém a geração do PDF em carregamento sob demanda; o aviso de tamanho do bundle principal é informativo e não interrompe a compilação.

Para inspeção manual em desenvolvimento, as rotas internas `__preview/onboarding` e `__preview/export` montam, respectivamente, o assistente aberto e o menu de exportação aberto. Elas são condicionadas ao ambiente de desenvolvimento e não são incluídas no comportamento de produção. Os componentes equivalentes também são exercitados nos testes de interface com as ações habilitadas.
