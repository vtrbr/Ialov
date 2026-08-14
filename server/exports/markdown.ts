export type ExportMessage = {
  role: string;
  kind?: string | null;
  content: string;
  createdAt: Date | string;
};

export type ExportConversation = {
  title: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

export type ExportArtifact = {
  title: string;
  filePath: string;
  language: string;
  kind: string;
  version: number;
  content: string;
  updatedAt: Date | string;
};

export type ExportArtifactVersion = {
  version: number;
  operation: string;
  summary: string;
  content: string;
  createdAt: Date | string;
};

function redactSensitiveText(value: string) {
  return value
    .replace(/\b(?:sk-[a-zA-Z0-9_-]{20,}|AIza[a-zA-Z0-9_-]{20,}|xai-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]{20,}|hf_[a-zA-Z0-9]{20,})\b/g, "[REDACTED]")
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g, "[REDACTED PRIVATE KEY]")
    .replace(/\b(api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|password|authorization)\s*[:=]\s*(["']?)[^\s"'`]{8,}\2/gi, "$1: [REDACTED]");
}

function heading(value: string) {
  return redactSensitiveText(value).replace(/[\r\n]+/g, " ").trim() || "Sem título";
}

function fenced(value: string) {
  return redactSensitiveText(value).replace(/```/g, "``\u200b`");
}

function timestamp(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "data indisponível" : date.toISOString();
}

function roleLabel(role: string) {
  return ({ user: "Usuário", assistant: "Lunex", system: "Sistema", tool: "Ferramenta" } as Record<string, string>)[role] || "Mensagem";
}

export function exportFileName(label: string, extension: "md" | "pdf") {
  const stem = heading(label)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .toLowerCase() || "exportacao-lunex";
  return `${stem}.${extension}`;
}

export function createConversationMarkdown(conversation: ExportConversation, messages: ExportMessage[]) {
  const sections = messages.map((message) => {
    const metadata = message.kind && message.kind !== "message" ? ` · ${message.kind}` : "";
    return `## ${roleLabel(message.role)}${metadata}\n\n_${timestamp(message.createdAt)}_\n\n${redactSensitiveText(message.content).trim() || "_Sem conteúdo_"}`;
  });

  return [
    `# Conversa: ${heading(conversation.title)}`,
    "",
    `Exportado pelo Lunex 1.2 em ${new Date().toISOString()}.`,
    `Criada em ${timestamp(conversation.createdAt)}.`,
    "",
    ...(sections.length ? sections : ["_Esta conversa ainda não possui mensagens._"]),
    "",
  ].join("\n");
}

export function createArtifactMarkdown(artifact: ExportArtifact, versions: ExportArtifactVersion[] = []) {
  const history = versions.map((version) => [
    `## Versão ${version.version} · ${heading(version.operation)}`,
    "",
    `${heading(version.summary)} — ${timestamp(version.createdAt)}`,
    "",
    `\`\`\`${heading(artifact.language || "text")}`,
    fenced(version.content),
    "\`\`\`",
    "",
  ].join("\n"));

  return [
    `# Artefato: ${heading(artifact.title)}`,
    "",
    `- Caminho: \`${heading(artifact.filePath)}\``,
    `- Tipo: ${heading(artifact.kind)}`,
    `- Versão atual: ${artifact.version}`,
    `- Atualizado em: ${timestamp(artifact.updatedAt)}`,
    "",
    "## Conteúdo atual",
    "",
    `\`\`\`${heading(artifact.language || "text")}`,
    fenced(artifact.content),
    "\`\`\`",
    "",
    ...(history.length ? ["# Histórico de versões", "", ...history] : []),
  ].join("\n");
}

export { redactSensitiveText };
