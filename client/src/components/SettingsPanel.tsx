import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TextSlot = "text_1" | "text_2" | "text_3" | "text_4";
type ProviderSlot = TextSlot | "image_1";
type ProviderName = "openai" | "anthropic" | "gemini" | "compatible" | "other";

export default function SettingsPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const utils = trpc.useUtils();
  const providers = trpc.agent.providers.list.useQuery(undefined, { enabled: open });
  const preferences = trpc.studio.preferences.get.useQuery(undefined, { enabled: open });
  const [slot, setSlot] = useState<ProviderSlot>("text_1");
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [priority, setPriority] = useState(10);
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseAuthConfigured, setFirebaseAuthConfigured] = useState(false);
  const [firestoreConfigured, setFirestoreConfigured] = useState(false);
  const [autonomyMode, setAutonomyMode] = useState<"ask" | "autonomous">("ask");
  const [preferredTextSlot, setPreferredTextSlot] = useState<TextSlot | "">("");

  const current = providers.data?.find(item => item.slot === slot);
  const saveProvider = trpc.agent.providers.save.useMutation({
    onSuccess: () => { setApiKey(""); utils.agent.providers.list.invalidate(); toast.success("Provedor salvo de forma protegida."); },
    onError: () => toast.error("Não foi possível salvar esse provedor."),
  });
  const updatePreferences = trpc.studio.preferences.update.useMutation({
    onSuccess: () => { utils.studio.preferences.get.invalidate(); toast.success("Status da integração salvo."); },
  });

  useEffect(() => {
    if (!preferences.data) return;
    setFirebaseProjectId(preferences.data.firebaseProjectId || "");
    setFirebaseAuthConfigured(Boolean(preferences.data.firebaseAuthConfigured));
    setFirestoreConfigured(Boolean(preferences.data.firestoreConfigured));
    setAutonomyMode(preferences.data.autonomyMode);
    setPreferredTextSlot((preferences.data.preferredTextSlot || "") as TextSlot | "");
  }, [preferences.data]);

  useEffect(() => {
    if (!current) return;
    setProvider(current.provider as ProviderName);
    setModel(current.model);
    setBaseUrl(current.baseUrl || "");
    setPriority(current.priority);
  }, [current?.id, current?.updatedAt]);

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full overflow-y-auto border-white/[.1] bg-[#171717] p-0 text-neutral-100 sm:max-w-[440px]">
      <div className="border-b border-white/[.08] px-6 py-5"><p className="text-sm font-medium">Configurações</p><p className="mt-1 text-xs text-neutral-500">As chaves são cifradas no servidor e nunca retornam ao navegador.</p></div>
      <div className="space-y-8 p-6">
        <section>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-medium">Pool de IA</h2><p className="mt-1 text-xs text-neutral-500">Quatro rotas de texto e uma rota de imagem.</p></div><span className="rounded-full bg-white/[.08] px-2 py-1 text-[10px] text-neutral-300">{providers.data?.filter(item => item.enabled).length || 0}/5 ativas</span></div>
          <div className="space-y-3">
            <label className="block text-xs text-neutral-400">Posição<select value={slot} onChange={event => setSlot(event.target.value as ProviderSlot)} className="mt-1.5 h-9 w-full rounded-md border border-white/[.12] bg-[#232323] px-2 text-xs text-neutral-200 outline-none focus:border-white/[.35]"><option value="text_1">Texto 1 · principal</option><option value="text_2">Texto 2 · fallback</option><option value="text_3">Texto 3 · fallback</option><option value="text_4">Texto 4 · fallback</option><option value="image_1">Imagem · dedicada</option></select></label>
            <div className="grid grid-cols-2 gap-3"><label className="block text-xs text-neutral-400">Provedor<select value={provider} onChange={event => setProvider(event.target.value as ProviderName)} className="mt-1.5 h-9 w-full rounded-md border border-white/[.12] bg-[#232323] px-2 text-xs text-neutral-200 outline-none focus:border-white/[.35]"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option><option value="compatible">Compatível</option><option value="other">Outro</option></select></label><label className="block text-xs text-neutral-400">Prioridade<Input value={priority} onChange={event => setPriority(Number(event.target.value) || 0)} type="number" min="0" max="100" className="mt-1.5 h-9 border-white/[.12] bg-[#232323] text-xs text-neutral-100" /></label></div>
            <label className="block text-xs text-neutral-400">Modelo<Input value={model} onChange={event => setModel(event.target.value)} className="mt-1.5 h-9 border-white/[.12] bg-[#232323] text-xs text-neutral-100" /></label>
            <label className="block text-xs text-neutral-400">Endpoint compatível <span className="text-neutral-600">(opcional)</span><Input value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://..." className="mt-1.5 h-9 border-white/[.12] bg-[#232323] text-xs text-neutral-100 placeholder:text-neutral-600" /></label>
            <label className="block text-xs text-neutral-400">Chave de API {current?.apiKeyFingerprint && <span className="text-emerald-400">· configurada ({current.apiKeyFingerprint})</span>}<Input value={apiKey} onChange={event => setApiKey(event.target.value)} type="password" placeholder={current?.apiKeyFingerprint ? "Informe apenas para substituir" : "Cole a chave aqui"} className="mt-1.5 h-9 border-white/[.12] bg-[#232323] text-xs text-neutral-100 placeholder:text-neutral-600" /></label>
            <Button disabled={!apiKey || saveProvider.isPending} onClick={() => saveProvider.mutate({ slot, provider, model, baseUrl: baseUrl || null, apiKey, priority, enabled: true })} className="h-9 w-full bg-white text-xs text-neutral-900 hover:bg-neutral-200">Salvar configuração</Button>
          </div>
        </section>
        <section className="border-t border-white/[.08] pt-7"><h2 className="text-sm font-medium">Controle do agente</h2><p className="mt-1 text-xs leading-5 text-neutral-500">Escolha quando o Lunex pede confirmação e qual rota textual tenta primeiro.</p><div className="mt-4 space-y-3"><div className="grid grid-cols-2 gap-2"><button onClick={() => setAutonomyMode("ask")} className={cn("rounded-md border p-2.5 text-left text-xs", autonomyMode === "ask" ? "border-white/[.35] bg-white/[.08] text-white" : "border-white/[.1] text-neutral-500")}><strong className="block font-medium">Confirmar</strong><span className="mt-1 block text-[10px]">Pergunta antes de alterar.</span></button><button onClick={() => setAutonomyMode("autonomous")} className={cn("rounded-md border p-2.5 text-left text-xs", autonomyMode === "autonomous" ? "border-white/[.35] bg-white/[.08] text-white" : "border-white/[.1] text-neutral-500")}><strong className="block font-medium">Autônomo</strong><span className="mt-1 block text-[10px]">Segue o plano automaticamente.</span></button></div><label className="block text-xs text-neutral-400">Rota inicial de texto<select value={preferredTextSlot} onChange={event => setPreferredTextSlot(event.target.value as TextSlot | "")} className="mt-1.5 h-9 w-full rounded-md border border-white/[.12] bg-[#232323] px-2 text-xs text-neutral-200 outline-none focus:border-white/[.35]"><option value="">Roteamento automático</option><option value="text_1">Texto 1</option><option value="text_2">Texto 2</option><option value="text_3">Texto 3</option><option value="text_4">Texto 4</option></select></label><Button variant="outline" onClick={() => updatePreferences.mutate({ autonomyMode, preferredTextSlot: preferredTextSlot || null })} className="h-9 w-full border-white/[.12] bg-transparent text-xs text-neutral-300 hover:bg-white/[.06] hover:text-white">Salvar preferências</Button></div></section>
        <section className="border-t border-white/[.08] pt-7"><h2 className="text-sm font-medium">Firebase <span className="text-neutral-500">(preparação)</span></h2><p className="mt-1 text-xs leading-5 text-neutral-500">As credenciais admin ficam somente no servidor.</p><div className="mt-4 space-y-3"><Input value={firebaseProjectId} onChange={event => setFirebaseProjectId(event.target.value)} placeholder="ID do projeto Firebase" className="h-9 border-white/[.12] bg-[#232323] text-xs text-neutral-100 placeholder:text-neutral-600" /><div className="grid grid-cols-2 gap-2"><label className="flex items-center gap-2 rounded-md border border-white/[.1] p-2.5 text-xs text-neutral-400"><input checked={firebaseAuthConfigured} onChange={event => setFirebaseAuthConfigured(event.target.checked)} type="checkbox" />Auth configurado</label><label className="flex items-center gap-2 rounded-md border border-white/[.1] p-2.5 text-xs text-neutral-400"><input checked={firestoreConfigured} onChange={event => setFirestoreConfigured(event.target.checked)} type="checkbox" />Firestore configurado</label></div><Button variant="outline" onClick={() => updatePreferences.mutate({ firebaseProjectId: firebaseProjectId || null, firebaseAuthConfigured, firestoreConfigured })} className="h-9 w-full border-white/[.12] bg-transparent text-xs text-neutral-300 hover:bg-white/[.06] hover:text-white">Salvar status do Firebase</Button></div></section>
      </div>
    </SheetContent>
  </Sheet>;
}
