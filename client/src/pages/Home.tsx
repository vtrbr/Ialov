import { useAuth } from "@/_core/hooks/useAuth";
import { ArtifactWorkspace } from "@/components/ArtifactWorkspace";
import { ExportMenu } from "@/components/ExportMenu";
import { LunexBrand, LunexSplash } from "@/components/LunexBrand";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { SetupAssistant } from "@/components/SetupAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { extractSseEvents } from "@/lib/agentStream";
import { exportContent, type ExportFormat } from "@/lib/exportFlow";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, FileCode2, FolderPlus, Loader2, Menu, MessageSquarePlus, Plus, Send, Settings2, TerminalSquare, UserRound } from "lucide-react";
import { toast } from "sonner";

type LiveMessage = { id: string; role: "user" | "assistant" | "tool"; content: string; isStreaming?: boolean };
type Project = { id: string; name: string; updatedAt: Date | string };

function isAgentEvent(value: unknown): value is { type: string; payload: Record<string, unknown> } {
  return Boolean(value && typeof value === "object" && "type" in value && "payload" in value);
}

function ProjectsRail({ projects, selectedId, onSelect, onCreate, onSettings }: { projects: Project[]; selectedId?: string; onSelect: (id: string) => void; onCreate: () => void; onSettings: () => void }) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar lg:w-[220px]">
      <div className="flex h-14 items-center justify-between px-3">
        <LunexBrand />
        <Button variant="ghost" size="icon" onClick={onCreate} className="h-7 w-7 text-muted-foreground">
          <FolderPlus className="h-4 w-4" />
          <span className="sr-only">Criar projeto</span>
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-2">
        <div className="space-y-0.5 py-1 pb-4">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition",
                selectedId === project.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{project.name}</span>
            </button>
          ))}
          {!projects.length && <p className="px-2.5 py-4 text-xs text-muted-foreground">Crie seu primeiro projeto para começar.</p>}
        </div>
      </ScrollArea>
      <div className="border-t border-border p-2">
        <button onClick={onSettings} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground">
          <Settings2 className="h-4 w-4" />
          Configurações
        </button>
      </div>
    </aside>
  );
}

function SettingsPanel({ open, onOpenChange, onOpenAssistant }: { open: boolean; onOpenChange: (open: boolean) => void; onOpenAssistant: () => void }) {
  const utils = trpc.useUtils();
  const providers = trpc.agent.providers.list.useQuery(undefined, { enabled: open });
  const preferences = trpc.studio.preferences.get.useQuery(undefined, { enabled: open });
  const [slot, setSlot] = useState<"text_1" | "text_2" | "text_3" | "text_4" | "image_1">("text_1");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "gemini" | "compatible" | "other">("openai");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseAuthConfigured, setFirebaseAuthConfigured] = useState(false);
  const [firestoreConfigured, setFirestoreConfigured] = useState(false);
  const [autonomyMode, setAutonomyMode] = useState<"ask" | "autonomous">("ask");
  const [preferredTextSlot, setPreferredTextSlot] = useState<"text_1" | "text_2" | "text_3" | "text_4" | "">("");
  const saveProvider = trpc.agent.providers.save.useMutation({ onSuccess: () => { setApiKey(""); utils.agent.providers.list.invalidate(); toast.success("Provedor salvo de forma protegida."); }, onError: () => toast.error("Não foi possível salvar esse provedor.") });
  const updatePreferences = trpc.studio.preferences.update.useMutation({ onSuccess: () => { utils.studio.preferences.get.invalidate(); toast.success("Status da integração salvo."); } });
  useEffect(() => { if (!preferences.data) return; setFirebaseProjectId(preferences.data.firebaseProjectId || ""); setFirebaseAuthConfigured(Boolean(preferences.data.firebaseAuthConfigured)); setFirestoreConfigured(Boolean(preferences.data.firestoreConfigured)); setAutonomyMode(preferences.data.autonomyMode); setPreferredTextSlot((preferences.data.preferredTextSlot || "") as typeof preferredTextSlot); }, [preferences.data]);
  const current = providers.data?.find(item => item.slot === slot);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-background p-0 sm:max-w-[420px]">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-medium">Configurações do estúdio</p>
          <p className="mt-1 text-xs text-muted-foreground">As chaves são cifradas no servidor e jamais retornam para o navegador.</p>
          <Button variant="outline" size="sm" onClick={onOpenAssistant} className="mt-3 h-8 text-xs">Abrir assistente de configuração</Button>
        </div>
        <div className="space-y-7 p-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">Pool de IA</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Quatro rotas de texto e uma rota exclusiva de imagem.</p>
              </div>
              <span className="text-xs text-muted-foreground">{providers.data?.filter(item => item.enabled).length || 0}/5 ativas</span>
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Posição
                <select value={slot} onChange={event => setSlot(event.target.value as typeof slot)} className="mt-1 h-9 w-full rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none">
                  <option value="text_1">Texto 1 · principal</option>
                  <option value="text_2">Texto 2 · fallback</option>
                  <option value="text_3">Texto 3 · fallback</option>
                  <option value="text_4">Texto 4 · fallback</option>
                  <option value="image_1">Imagem · dedicada</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-muted-foreground">
                  Provedor
                  <select value={provider} onChange={event => setProvider(event.target.value as typeof provider)} className="mt-1 h-9 w-full rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none">
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                    <option value="compatible">Compatível</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label className="block text-xs text-muted-foreground">
                  Prioridade
                  <Input type="number" min="0" max="100" defaultValue={current?.priority || 10} className="mt-1 h-9 text-xs" />
                </label>
              </div>
              <label className="block text-xs text-muted-foreground">
                Modelo
                <Input value={model} onChange={event => setModel(event.target.value)} placeholder="gpt-4.1-mini" className="mt-1 h-9 text-xs" />
              </label>
              <label className="block text-xs text-muted-foreground">
                Endpoint compatível <span className="text-muted-foreground/70">(opcional)</span>
                <Input value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://..." className="mt-1 h-9 text-xs" />
              </label>
              <label className="block text-xs text-muted-foreground">
                Chave de API {current?.apiKeyFingerprint && <span className="text-emerald-600 dark:text-emerald-400">· configurada ({current.apiKeyFingerprint})</span>}
                <Input value={apiKey} onChange={event => setApiKey(event.target.value)} type="password" placeholder={current?.apiKeyFingerprint ? "Informe apenas para substituir" : "Cole a chave aqui"} className="mt-1 h-9 text-xs" />
              </label>
              <Button disabled={!apiKey || saveProvider.isPending} onClick={() => saveProvider.mutate({ slot, provider, model, baseUrl: baseUrl || null, apiKey, priority: current?.priority || 10, enabled: true })} className="h-9 w-full text-xs">Salvar configuração</Button>
            </div>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="text-sm font-medium">Controle do agente</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha quando o agente deve pedir confirmação e qual rota textual prefere iniciar.</p>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAutonomyMode("ask")} className={cn("rounded-md border p-2.5 text-left text-xs", autonomyMode === "ask" ? "border-foreground/30 bg-accent" : "border-border text-muted-foreground")}>
                  <strong className="block font-medium text-foreground">Confirmar</strong>
                  <span className="mt-0.5 block text-[11px]">Pergunta antes de alterações.</span>
                </button>
                <button onClick={() => setAutonomyMode("autonomous")} className={cn("rounded-md border p-2.5 text-left text-xs", autonomyMode === "autonomous" ? "border-foreground/30 bg-accent" : "border-border text-muted-foreground")}>
                  <strong className="block font-medium text-foreground">Autônomo</strong>
                  <span className="mt-0.5 block text-[11px]">Segue o plano automaticamente.</span>
                </button>
              </div>
              <label className="block text-xs text-muted-foreground">
                Rota inicial de texto
                <select value={preferredTextSlot} onChange={event => setPreferredTextSlot(event.target.value as typeof preferredTextSlot)} className="mt-1 h-9 w-full rounded-md border border-border bg-transparent px-2 text-xs text-foreground outline-none">
                  <option value="">Roteamento automático</option>
                  <option value="text_1">Texto 1</option>
                  <option value="text_2">Texto 2</option>
                  <option value="text_3">Texto 3</option>
                  <option value="text_4">Texto 4</option>
                </select>
              </label>
              <Button variant="outline" onClick={() => updatePreferences.mutate({ autonomyMode, preferredTextSlot: preferredTextSlot || null })} className="h-9 w-full text-xs">Salvar preferências do agente</Button>
            </div>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="text-sm font-medium">Firebase <span className="text-muted-foreground">(preparação)</span></h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Marque o estado quando concluir a configuração no console do Firebase. As credenciais admin ficam somente no servidor.</p>
            <div className="mt-3 space-y-3">
              <Input value={firebaseProjectId} onChange={event => setFirebaseProjectId(event.target.value)} placeholder="ID do projeto Firebase" className="h-9 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-md border border-border p-2.5 text-xs text-muted-foreground">
                  <input checked={firebaseAuthConfigured} onChange={event => setFirebaseAuthConfigured(event.target.checked)} type="checkbox" /> Auth configurado
                </label>
                <label className="flex items-center gap-2 rounded-md border border-border p-2.5 text-xs text-muted-foreground">
                  <input checked={firestoreConfigured} onChange={event => setFirestoreConfigured(event.target.checked)} type="checkbox" /> Firestore configurado
                </label>
              </div>
              <Button variant="outline" onClick={() => updatePreferences.mutate({ firebaseProjectId: firebaseProjectId || null, firebaseAuthConfigured, firestoreConfigured })} className="h-9 w-full text-xs">Salvar status do Firebase</Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Home({ validationPreview: previewOverride }: { validationPreview?: "onboarding" | "export" }) {
  const { loading, isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const validationPreview = previewOverride || (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("preview"));
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [selectedConversationId, setSelectedConversationId] = useState<string>();
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>();
  const [prompt, setPrompt] = useState("");
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [mobileView, setMobileView] = useState<"chat" | "code" | "preview">("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(() => validationPreview === "onboarding");
  const [validationExportOpen, setValidationExportOpen] = useState(() => validationPreview === "export");
  const bootstrapped = useRef(false);
  const setupPrompted = useRef(false);
  const projects = trpc.studio.projects.list.useQuery(undefined, { enabled: isAuthenticated });
  const createProject = trpc.studio.projects.create.useMutation({ onSuccess: project => { utils.studio.projects.list.invalidate(); if (project) setSelectedProjectId(project.id); }, onError: () => toast.error("Não foi possível criar o projeto.") });
  const conversations = trpc.studio.conversations.list.useQuery({ projectId: selectedProjectId || "project-pending" }, { enabled: Boolean(selectedProjectId) });
  const createConversation = trpc.studio.conversations.create.useMutation({ onSuccess: conversation => { if (selectedProjectId) utils.studio.conversations.list.invalidate({ projectId: selectedProjectId }); if (conversation) setSelectedConversationId(conversation.id); } });
  const persistedMessages = trpc.studio.conversations.messages.useQuery({ conversationId: selectedConversationId || "conversation-pending" }, { enabled: Boolean(selectedConversationId) });
  const artifacts = trpc.studio.artifacts.list.useQuery({ projectId: selectedProjectId || "project-pending" }, { enabled: Boolean(selectedProjectId) });
  const initialProviders = trpc.agent.providers.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const selectedArtifact = artifacts.data?.find(item => item.id === selectedArtifactId) || artifacts.data?.[0];
  const versions = trpc.studio.artifacts.versions.useQuery({ artifactId: selectedArtifact?.id || "artifact-pending" }, { enabled: Boolean(selectedArtifact) });
  const diff = trpc.studio.artifacts.diff.useQuery({ artifactId: selectedArtifact?.id || "artifact-pending", beforeVersion: versions.data?.[1]?.version || 1, afterVersion: versions.data?.[0]?.version || 1 }, { enabled: Boolean(selectedArtifact && versions.data && versions.data.length > 1) });
  const updateArtifact = trpc.studio.artifacts.update.useMutation({ onSuccess: () => { if (selectedProjectId) utils.studio.artifacts.list.invalidate({ projectId: selectedProjectId }); if (selectedArtifact) utils.studio.artifacts.versions.invalidate({ artifactId: selectedArtifact.id }); toast.success("Checkpoint do artefato criado."); }, onError: () => toast.error("Não foi possível salvar este artefato.") });
  const restoreArtifact = trpc.studio.artifacts.restore.useMutation({ onSuccess: () => { if (selectedProjectId) utils.studio.artifacts.list.invalidate({ projectId: selectedProjectId }); if (selectedArtifact) utils.studio.artifacts.versions.invalidate({ artifactId: selectedArtifact.id }); toast.success("Versão restaurada."); } });
  const exportConversation = trpc.studio.exports.conversation.useMutation();
  const exportArtifact = trpc.studio.exports.artifact.useMutation();

  useEffect(() => { if (projects.data?.length && !selectedProjectId) setSelectedProjectId(projects.data[0].id); }, [projects.data, selectedProjectId]);
  useEffect(() => { if (!isAuthenticated || projects.isLoading || projects.data?.length || bootstrapped.current) return; bootstrapped.current = true; createProject.mutate({ name: "Meu primeiro projeto", description: "Espaço inicial", template: "blank" }); }, [isAuthenticated, projects.isLoading, projects.data, createProject]);
  useEffect(() => { if (conversations.data?.length && !selectedConversationId) setSelectedConversationId(conversations.data[0].id); if (selectedProjectId && conversations.data && !conversations.data.length && !createConversation.isPending) createConversation.mutate({ projectId: selectedProjectId, title: "Nova conversa" }); }, [conversations.data, selectedConversationId, selectedProjectId, createConversation]);
  useEffect(() => { if (setupPrompted.current || !initialProviders.isSuccess || initialProviders.data.some(provider => provider.enabled)) return; setupPrompted.current = true; setSetupOpen(true); }, [initialProviders.data, initialProviders.isSuccess]);
  useEffect(() => { if (validationPreview === "onboarding") setSetupOpen(true); if (validationPreview === "export") setValidationExportOpen(true); }, [validationPreview]);
  useEffect(() => { setSelectedArtifactId(artifacts.data?.[0]?.id); }, [selectedProjectId, artifacts.data]);
  useEffect(() => { setLiveMessages([]); }, [selectedConversationId]);
  const displayMessages = useMemo<LiveMessage[]>(() => [...(persistedMessages.data || []).map((message): LiveMessage => ({ id: message.id, role: message.role as LiveMessage["role"], content: message.content })), ...liveMessages], [persistedMessages.data, liveMessages]);
  const terminalEvents = useMemo(() => displayMessages.filter(message => message.role === "tool"), [displayMessages]);
  const createNewProject = () => { const name = window.prompt("Nome do novo projeto", "Novo projeto"); if (name?.trim()) createProject.mutate({ name: name.trim(), template: "blank" }); };
  const exportSelectedConversation = (format: ExportFormat) => {
    if (!selectedConversationId) return;
    exportConversation.mutate({ conversationId: selectedConversationId }, { onSuccess: payload => void exportContent(payload, format), onError: () => toast.error("Não foi possível exportar esta conversa.") });
  };
  const exportSelectedArtifact = (format: ExportFormat) => {
    if (!selectedArtifact) return;
    exportArtifact.mutate({ artifactId: selectedArtifact.id, includeHistory: true }, { onSuccess: payload => void exportContent(payload, format), onError: () => toast.error("Não foi possível exportar este artefato.") });
  };
  const sendPrompt = async () => {
    const content = prompt.trim(); if (!content || !selectedProjectId || !selectedConversationId || running) return;
    setPrompt(""); setRunning(true); const assistantId = `local-assistant-${Date.now()}`;
    setLiveMessages([{ id: `local-user-${Date.now()}`, role: "user", content }, { id: assistantId, role: "assistant", content: "", isStreaming: true }]);
    try {
      const response = await fetch("/api/agent/stream", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedProjectId, conversationId: selectedConversationId, prompt: content }) });
      if (!response.ok || !response.body) throw new Error("O agente não pôde iniciar a execução.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const result = extractSseEvents(buffer); buffer = result.remaining; for (const parsed of result.events) { if (!isAgentEvent(parsed)) continue; if (parsed.type === "text.delta") setLiveMessages(current => current.map(item => item.id === assistantId ? { ...item, content: item.content + String(parsed.payload.delta || "") } : item)); if (parsed.type === "tool.started") setLiveMessages(current => [...current, { id: `tool-${Date.now()}`, role: "tool", content: String(parsed.payload.label || "Executando ferramenta") }]); if (parsed.type === "run.failed" && !parsed.payload.recoverable) toast.error(String(parsed.payload.message || "A execução falhou.")); } }
      await Promise.all([utils.studio.conversations.messages.invalidate({ conversationId: selectedConversationId }), utils.studio.artifacts.list.invalidate({ projectId: selectedProjectId })]);
    } catch (error) { setLiveMessages(current => current.map(item => item.id === assistantId ? { ...item, content: `Não foi possível concluir agora. ${error instanceof Error ? error.message : "Tente novamente."}` } : item)); } finally { setLiveMessages(current => current.map(item => item.id === assistantId ? { ...item, isStreaming: false } : item)); setRunning(false); }
  };

  if (loading) return <LunexSplash />;

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-sm rounded-xl border border-border p-8 text-center">
          <LunexBrand className="justify-center" />
          <h1 className="mt-6 text-xl font-medium tracking-tight text-foreground">Seu estúdio de agentes está pronto.</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Converse, gere artefatos e acompanhe cada mudança em um só lugar.</p>
          <Button onClick={() => startLogin()} className="mt-6 w-full">Entrar</Button>
        </div>
      </main>
    );
  }

  const rail = <ProjectsRail projects={projects.data || []} selectedId={selectedProjectId} onSelect={id => { setSelectedProjectId(id); setSelectedConversationId(undefined); }} onCreate={createNewProject} onSettings={() => setSettingsOpen(true)} />;

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} onOpenAssistant={() => { setSettingsOpen(false); setSetupOpen(true); }} />
      <SetupAssistant open={setupOpen} onOpenChange={setSetupOpen} />
      <div className="flex h-full">
        <div className="hidden lg:block">{rail}</div>

        <section className={cn("flex min-w-0 flex-1 flex-col border-r border-border pb-14 md:pb-0 xl:max-w-[460px]", mobileView !== "chat" && "hidden md:flex")}>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden"><Menu className="h-4 w-4" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] border-border bg-sidebar p-0">{rail}</SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{projects.data?.find(project => project.id === selectedProjectId)?.name || "Carregando projeto…"}</p>
            </div>
            <ExportMenu onExport={validationPreview === "export" ? () => toast.info("Prévia de exportação aberta.") : exportSelectedConversation} disabled={!selectedConversationId && validationPreview !== "export"} pending={exportConversation.isPending} subject="conversa" defaultOpen={validationPreview === "export"} open={validationPreview === "export" ? validationExportOpen : undefined} onOpenChange={validationPreview === "export" ? setValidationExportOpen : undefined} />
            <Button variant="ghost" size="icon" onClick={() => selectedProjectId && createConversation.mutate({ projectId: selectedProjectId, title: "Nova conversa" })} className="h-8 w-8 text-muted-foreground">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </header>

          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6">
              {!displayMessages.length && (
                <div className="mt-[14vh] text-center">
                  <h1 className="text-xl font-medium tracking-tight text-foreground">O que vamos construir?</h1>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Descreva a ideia. O agente planeja, cria os arquivos e mostra as mudanças em tempo real.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {["Criar landing page", "Gerar dashboard", "Explicar este projeto"].map(suggestion => (
                      <button key={suggestion} onClick={() => setPrompt(suggestion)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground">
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {displayMessages.map(message =>
                message.role === "tool" ? (
                  <div key={message.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                    <TerminalSquare className="h-3.5 w-3.5" />
                    {message.content}
                  </div>
                ) : (
                  <article key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
                    <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground", message.role === "assistant" ? "bg-transparent" : "bg-muted")}>
                      {message.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                    </div>
                    <div className={cn("min-w-0 max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6", message.role === "user" ? "bg-muted text-foreground" : "text-foreground")}>
                      {message.content ? <MarkdownMessage content={message.content} /> : message.isStreaming ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                    </div>
                  </article>
                )
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t border-border p-3 sm:p-4">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border p-2 focus-within:border-foreground/30">
              <Textarea
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendPrompt(); } }}
                placeholder="Peça algo ao agente…"
                className="min-h-14 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              />
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Plus className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-md px-2 text-[11px] text-muted-foreground">Auto <ChevronDown className="h-3 w-3" /></Button>
                </div>
                <Button size="icon" disabled={!prompt.trim() || running} onClick={sendPrompt} className="h-8 w-8 rounded-lg disabled:opacity-40">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className={cn("min-w-0 flex-1 bg-background p-3 pb-16 lg:p-4", mobileView === "chat" && "hidden md:block")}>
          <div className="mb-2 flex items-center justify-between md:hidden">
            <span className="text-xs font-medium text-muted-foreground">{mobileView === "preview" ? "Preview" : "Código"}</span>
          </div>
          <div className="flex h-full min-h-0 gap-3">
            <aside className="hidden w-44 shrink-0 rounded-lg border border-border p-2 xl:block">
              <p className="px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Arquivos</p>
              <div className="space-y-0.5">
                {artifacts.data?.map(artifact => (
                  <button
                    key={artifact.id}
                    onClick={() => setSelectedArtifactId(artifact.id)}
                    className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs", selectedArtifact?.id === artifact.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
                  >
                    <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{artifact.filePath}</span>
                  </button>
                ))}
                {!artifacts.data?.length && <p className="px-2 py-4 text-xs leading-5 text-muted-foreground">Os arquivos criados aparecerão aqui.</p>}
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <ArtifactWorkspace
                artifact={selectedArtifact}
                versions={versions.data || []}
                diffLines={diff.data?.lines || []}
                activeTab={mobileView === "preview" ? "preview" : "code"}
                onActiveTabChange={tab => { if (tab === "preview") setMobileView("preview"); if (tab === "code") setMobileView("code"); }}
                saving={updateArtifact.isPending || restoreArtifact.isPending}
                onSave={content => selectedArtifact && updateArtifact.mutate({ artifactId: selectedArtifact.id, content, summary: "Edição manual" })}
                onRestore={version => selectedArtifact && restoreArtifact.mutate({ artifactId: selectedArtifact.id, version })}
                onExport={exportSelectedArtifact}
                exporting={exportArtifact.isPending}
              />
            </div>

            <aside aria-label="Terminal do agente" className="hidden w-[210px] shrink-0 flex-col overflow-hidden rounded-lg border border-border xl:flex">
              <div className="flex h-9 items-center gap-2 border-b border-border px-3 text-xs font-medium text-muted-foreground">
                <TerminalSquare className="h-3.5 w-3.5" />
                Terminal
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-2 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
                  <p>agente conectado</p>
                  <p>projeto: {selectedProjectId?.slice(0, 8) || "—"}</p>
                  {terminalEvents.length ? terminalEvents.map(event => <p key={event.id} className="break-words text-foreground/80">{event.content}</p>) : <p className="pt-2">As etapas do agente aparecerão aqui.</p>}
                </div>
              </ScrollArea>
            </aside>
          </div>
        </section>

        <nav aria-label="Navegação do estúdio" className="fixed inset-x-0 bottom-0 z-30 grid h-14 grid-cols-4 border-t border-border bg-background px-2 md:hidden">
          <button aria-pressed={mobileView === "chat"} onClick={() => setMobileView("chat")} className={cn("grid place-items-center text-[10px]", mobileView === "chat" ? "text-foreground" : "text-muted-foreground")}>
            <MessageSquarePlus className="h-4 w-4" /><span>Chat</span>
          </button>
          <button aria-pressed={mobileView === "code"} onClick={() => setMobileView("code")} className={cn("grid place-items-center text-[10px]", mobileView === "code" ? "text-foreground" : "text-muted-foreground")}>
            <FileCode2 className="h-4 w-4" /><span>Código</span>
          </button>
          <button aria-pressed={mobileView === "preview"} onClick={() => setMobileView("preview")} className={cn("grid place-items-center text-[10px]", mobileView === "preview" ? "text-foreground" : "text-muted-foreground")}>
            <FileCode2 className="h-4 w-4" /><span>Preview</span>
          </button>
          <button onClick={() => setSettingsOpen(true)} className="grid place-items-center text-[10px] text-muted-foreground">
            <Settings2 className="h-4 w-4" /><span>Ajustes</span>
          </button>
        </nav>
      </div>
    </main>
  );
}
