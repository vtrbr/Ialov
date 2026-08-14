import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleAlert, KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Slot = "text_1" | "text_2" | "text_3" | "text_4" | "image_1";
type Provider = "openai" | "anthropic" | "gemini" | "compatible" | "other";
type Step = "providers" | "firebase" | "review";

const slots: Array<{ value: Slot; label: string; detail: string; provider: Provider; model: string }> = [
  { value: "text_1", label: "Texto 1", detail: "Rota principal", provider: "openai", model: "gpt-4.1-mini" },
  { value: "text_2", label: "Texto 2", detail: "Fallback 1", provider: "anthropic", model: "claude-sonnet-4-5" },
  { value: "text_3", label: "Texto 3", detail: "Fallback 2", provider: "gemini", model: "gemini-2.5-flash" },
  { value: "text_4", label: "Texto 4", detail: "Fallback 3", provider: "compatible", model: "modelo-compatível" },
  { value: "image_1", label: "Imagem", detail: "Geração dedicada", provider: "openai", model: "gpt-image-1" },
];

export function SetupAssistant({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const utils = trpc.useUtils();
  const providers = trpc.agent.providers.list.useQuery(undefined, { enabled: open });
  const preferences = trpc.studio.preferences.get.useQuery(undefined, { enabled: open });
  const firebaseStatus = trpc.studio.firebase.status.useQuery(undefined, { enabled: open });
  const [step, setStep] = useState<Step>("providers");
  const [slot, setSlot] = useState<Slot>("text_1");
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseAuthConfigured, setFirebaseAuthConfigured] = useState(false);
  const [firestoreConfigured, setFirestoreConfigured] = useState(false);
  const saveProvider = trpc.agent.providers.save.useMutation({
    onSuccess: () => {
      setApiKey("");
      utils.agent.providers.list.invalidate();
      toast.success("Chave armazenada de forma protegida.");
    },
    onError: () => toast.error("Não foi possível salvar esse provedor."),
  });
  const updatePreferences = trpc.studio.preferences.update.useMutation({
    onSuccess: () => {
      utils.studio.preferences.get.invalidate();
      toast.success("Status do Firebase registrado.");
    },
    onError: () => toast.error("Não foi possível salvar o status do Firebase."),
  });

  const configuredCount = providers.data?.filter((item) => item.enabled).length || 0;
  const currentSlot = useMemo(() => slots.find((item) => item.value === slot) || slots[0], [slot]);
  const currentConfig = providers.data?.find((item) => item.slot === slot);
  const currentStep = ["providers", "firebase", "review"].indexOf(step);
  const setupLoading = providers.isLoading || preferences.isLoading || firebaseStatus.isLoading;
  const setupError = providers.isError || preferences.isError || firebaseStatus.isError;

  useEffect(() => {
    if (!open) return;
    setStep("providers");
  }, [open]);

  useEffect(() => {
    if (!preferences.data) return;
    setFirebaseProjectId(preferences.data.firebaseProjectId || "");
    setFirebaseAuthConfigured(Boolean(preferences.data.firebaseAuthConfigured));
    setFirestoreConfigured(Boolean(preferences.data.firestoreConfigured));
  }, [preferences.data]);

  function selectSlot(nextSlot: Slot) {
    const next = slots.find((item) => item.value === nextSlot) || slots[0];
    setSlot(nextSlot);
    setProvider(next.provider);
    setModel(next.model);
    setApiKey("");
  }

  function saveCurrentProvider() {
    if (!apiKey.trim()) return;
    saveProvider.mutate({ slot, provider, model: model.trim() || currentSlot.model, apiKey: apiKey.trim(), priority: 100 - slots.findIndex((item) => item.value === slot) * 10, enabled: true });
  }

  function saveFirebaseStatus() {
    updatePreferences.mutate({ firebaseProjectId: firebaseProjectId.trim() || null, firebaseAuthConfigured, firestoreConfigured });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto p-0 sm:max-w-2xl" aria-describedby="assistente-descricao">
        <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3 pr-7">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted"><Sparkles className="h-4 w-4 text-foreground" /></div>
            <div>
              <DialogTitle>Configuração inicial</DialogTitle>
              <DialogDescription id="assistente-descricao" className="mt-1 text-xs leading-5">Configure o estúdio em etapas. As chaves de IA são enviadas diretamente ao servidor cifrado; o assistente nunca as exibe novamente.</DialogDescription>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Etapas da configuração">
            {[{ key: "providers", label: "IA" }, { key: "firebase", label: "Firebase" }, { key: "review", label: "Resumo" }].map((item, index) => (
              <div key={item.key} className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px]", index <= currentStep ? "border-foreground/20 bg-accent text-foreground" : "border-border text-muted-foreground")}>
                <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[10px]", index < currentStep ? "bg-foreground text-background" : "border border-current")}>{index < currentStep ? <Check className="h-3 w-3" /> : index + 1}</span>
                {item.label}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="px-5 py-5 sm:px-6">
          {setupLoading && <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground" role="status">Carregando o estado protegido da configuração…</div>}
          {setupError && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive" role="alert">Não foi possível verificar a configuração atual. Revise sua sessão e tente novamente antes de salvar alterações.</div>}
          {step === "providers" && (
            <fieldset className="space-y-5 disabled:opacity-60" disabled={setupLoading || setupError}>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">{configuredCount}/5 rotas ativas.</strong> Comece pela rota principal; as demais criam redundância para o agente. Cada chave fica cifrada no backend e o navegador recebe apenas um indicador parcial.</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {slots.map((item) => {
                  const configured = providers.data?.some((config) => config.slot === item.value && config.enabled);
                  return <button type="button" key={item.value} onClick={() => selectSlot(item.value)} className={cn("rounded-lg border p-2 text-left transition", slot === item.value ? "border-foreground/30 bg-accent" : "border-border hover:bg-accent/60")}><span className="flex items-center justify-between gap-1 text-xs font-medium text-foreground">{item.label}{configured && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}</span><span className="mt-1 block text-[10px] text-muted-foreground">{item.detail}</span></button>;
                })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-muted-foreground">Provedor<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option><option value="compatible">Compatível</option><option value="other">Outro</option></select></label>
                <label className="text-xs text-muted-foreground">Modelo<Input value={model} onChange={(event) => setModel(event.target.value)} className="mt-1 h-9 text-xs" /></label>
              </div>
              <label className="block text-xs text-muted-foreground"><span className="flex items-center gap-1.5 text-foreground"><KeyRound className="h-3.5 w-3.5" /> Chave para {currentSlot.label}{currentConfig?.apiKeyFingerprint && <span className="font-normal text-emerald-600 dark:text-emerald-400">· já configurada ({currentConfig.apiKeyFingerprint})</span>}</span><Input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" autoComplete="off" placeholder={currentConfig?.apiKeyFingerprint ? "Cole outra chave somente para substituir" : "Cole a chave de API"} className="mt-1 h-10 text-sm" /><span className="mt-1.5 block leading-5">A chave é cifrada antes de ser persistida e não será mostrada novamente.</span></label>
              <Button onClick={saveCurrentProvider} disabled={!apiKey.trim() || saveProvider.isPending} className="w-full sm:w-auto">Salvar {currentSlot.label}</Button>
            </fieldset>
          )}

          {step === "firebase" && (
            <fieldset className="space-y-5 disabled:opacity-60" disabled={setupLoading || setupError}>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">O que o assistente registra:</strong> o ID do projeto e as etapas concluídas. Nunca cole a service account nesta tela: `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY` precisam ser cadastradas apenas como segredos do servidor.</div>
              <div className={cn("rounded-lg border p-3 text-xs leading-5", firebaseStatus.data?.enabled ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground" : "border-amber-500/30 bg-amber-500/5 text-muted-foreground")}><strong className="font-medium text-foreground">Status do servidor: </strong>{firebaseStatus.data?.enabled ? "credenciais administrativas detectadas e camada de compatibilidade pronta." : firebaseStatus.data?.reason === "missing_project_id" ? "aguardando FIREBASE_PROJECT_ID protegido no servidor." : "aguardando credenciais administrativas protegidas no servidor."}</div>
              <label className="block text-xs text-muted-foreground">ID do projeto Firebase<Input value={firebaseProjectId} onChange={(event) => setFirebaseProjectId(event.target.value)} placeholder="meu-projeto-firebase" className="mt-1 h-10 text-sm" /></label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm"><input checked={firebaseAuthConfigured} onChange={(event) => setFirebaseAuthConfigured(event.target.checked)} type="checkbox" className="mt-0.5" /><span><strong className="block font-medium text-foreground">Firebase Authentication</strong><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">Ative os provedores de login e autorize o domínio do Lunex no console Firebase.</span></span></label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm"><input checked={firestoreConfigured} onChange={(event) => setFirestoreConfigured(event.target.checked)} type="checkbox" className="mt-0.5" /><span><strong className="block font-medium text-foreground">Cloud Firestore</strong><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">Publique `firestore.rules` e valide os cenários no simulador antes de usar em produção.</span></span></label>
              </div>
              <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />A migração de autenticação continua desativada até as credenciais administrativas estarem protegidas no servidor. O acesso atual por sessão Lunex permanece funcionando.</div>
              <Button variant="outline" onClick={saveFirebaseStatus} disabled={updatePreferences.isPending}>Salvar status do Firebase</Button>
            </fieldset>
          )}

          {step === "review" && (
            <section className="space-y-4">
              <div className="rounded-lg border border-border p-4"><p className="text-sm font-medium text-foreground">Seu estúdio está pronto para avançar.</p><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Rotas de IA ativas</dt><dd className="font-medium text-foreground">{configuredCount}/5</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Projeto Firebase</dt><dd className="truncate font-medium text-foreground">{firebaseProjectId || "Ainda não informado"}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Etapas Firebase</dt><dd className="font-medium text-foreground">{[firebaseAuthConfigured, firestoreConfigured].filter(Boolean).length}/2</dd></div></dl></div>
              <div className="rounded-lg border border-border p-4"><p className="text-sm font-medium text-foreground">Seu estúdio está pronto para avançar.</p><dl className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Rotas de IA ativas</dt><dd className="font-medium text-foreground">{configuredCount}/5</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Projeto Firebase</dt><dd className="truncate font-medium text-foreground">{firebaseProjectId || "Ainda não informado"}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Etapas Firebase</dt><dd className="font-medium text-foreground">{[firebaseAuthConfigured, firestoreConfigured].filter(Boolean).length}/2</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Compatibilidade no servidor</dt><dd className={cn("font-medium", firebaseStatus.data?.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{firebaseStatus.data?.enabled ? "Pronta" : "Pendente"}</dd></div></dl></div>
              <p className="text-xs leading-5 text-muted-foreground">Você pode voltar a este assistente em <strong className="font-medium text-foreground">Configurações</strong> sempre que quiser trocar uma chave, habilitar um fallback ou concluir o Firebase.</p>
            </section>
          )}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4 sm:px-6">
          {step !== "providers" ? <Button variant="ghost" onClick={() => setStep(step === "review" ? "firebase" : "providers")}><ChevronLeft className="mr-1 h-4 w-4" />Voltar</Button> : <span />}
          {step === "review" ? <Button onClick={() => onOpenChange(false)}>Concluir</Button> : <Button onClick={() => setStep(step === "providers" ? "firebase" : "review")}>Continuar<ChevronRight className="ml-1 h-4 w-4" /></Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
