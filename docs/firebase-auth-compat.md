# Compatibilidade com Firebase Auth

O Lunex 1.2 mantém a sessão OAuth atual durante o MVP. A tabela `users` possui `firebaseUid` opcional e `firebaseLinkedAt`, permitindo ligar uma identidade Firebase **sem recriar** projetos, conversas ou artefatos existentes.

O módulo `server/auth/firebaseCompat.ts` é a fronteira de integração. Ele impede vínculo a um UID já associado e exige e-mail compatível quando os dois lados informam e-mail. A verificação real do token deverá ocorrer apenas no servidor, usando Firebase Admin, depois que as credenciais de serviço forem configuradas pelo administrador.

Não envie JSON de service account, tokens Firebase ou chaves de IA pelo navegador. Quando configuradas, as credenciais administrativas devem estar em variáveis de ambiente do servidor; o cliente só recebe um estado de prontidão sem dados sensíveis.
