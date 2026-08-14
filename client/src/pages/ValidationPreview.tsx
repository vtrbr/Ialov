import React, { useState } from "react";
import { Check, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ExportMenu } from "@/components/ExportMenu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Prévia apenas para verificação visual local; não consulta APIs nem persiste dados. */
export default function ValidationPreview({ mode = "all" }: { mode?: "all" | "export" }) {
  const [open, setOpen] = useState(true);
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground sm:p-8">
      <section className="w-full max-w-4xl rounded-xl border border-border bg-card p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Prévia de validação visual</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Ambiente local sem sessão, sem dados persistidos e sem credenciais reais.</p>
          </div>
          <ExportMenu defaultOpen subject="conversa" onExport={(format) => toast.info(`Ação de exportação ${format.toUpperCase()} verificada.`)} />
        </div>
        <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4"><Check className="mb-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />Menu de download acionável</div>
          <div className="rounded-lg border border-border p-4"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />Sem chaves no navegador</div>
          <div className="rounded-lg border border-border p-4"><Sparkles className="mb-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />Layout responsivo verificado</div>
        </div>
      </section>

      <Dialog open={mode === "all" && open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3 pr-7">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><Sparkles className="h-4 w-4" /></div>
              <div>
                <DialogTitle>Configuração inicial</DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-5">Prévia do fluxo real: as chaves seguem somente ao servidor cifrado e nunca voltam à interface.</DialogDescription>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Etapas da configuração">
              {[["1", "IA"], ["2", "Firebase"], ["3", "Resumo"]].map(([step, label], index) => <div key={label} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] ${index === 0 ? "border-foreground/20 bg-accent text-foreground" : "border-border text-muted-foreground"}`}><span className="grid h-4 w-4 place-items-center rounded-full border border-current text-[10px]">{step}</span>{label}</div>)}
            </div>
          </DialogHeader>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">0/5 rotas ativas.</strong> Comece pela rota principal e complete os fallbacks para manter o agente disponível.</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{["Texto 1", "Texto 2", "Texto 3", "Texto 4", "Imagem"].map((slot, index) => <button type="button" key={slot} className={`rounded-lg border p-2 text-left ${index === 0 ? "border-foreground/30 bg-accent" : "border-border"}`}><span className="block text-xs font-medium">{slot}</span><span className="mt-1 block text-[10px] text-muted-foreground">{index === 0 ? "Rota principal" : "Fallback"}</span></button>)}</div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Provedor<select className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"><option>OpenAI</option><option>Anthropic</option><option>Gemini</option></select></label><label className="text-xs text-muted-foreground">Modelo<Input defaultValue="gpt-4.1-mini" className="mt-1 h-9 text-xs" /></label></div>
            <label className="block text-xs text-muted-foreground"><span className="flex items-center gap-1.5 text-foreground"><KeyRound className="h-3.5 w-3.5" />Chave da rota principal</span><Input type="password" placeholder="Cole a chave de API" className="mt-1 h-10 text-sm" /><span className="mt-1.5 block leading-5">A chave é cifrada antes de ser persistida e não será mostrada novamente.</span></label>
          </div>
          <DialogFooter className="border-t border-border px-5 py-4 sm:px-6"><Button variant="ghost" onClick={() => toast.info("Nesta prévia não há persistência.")}>Voltar</Button><Button onClick={() => toast.info("Controles verificados.")}>Continuar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
