import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Code2, Eye, GitCompareArrows, RotateCcw, Save } from "lucide-react";
import { ArtifactPreview } from "./ArtifactPreview";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type Artifact = {
  id: string;
  title: string;
  filePath: string;
  language: string;
  content: string;
  previewMode: "none" | "html" | "react";
  version: number;
};

type Version = { id: string; version: number; summary: string; createdAt: Date | string; operation: string };
type DiffLine = { type: "same" | "add" | "remove"; value: string; beforeLine?: number; afterLine?: number };

export function ArtifactWorkspace({
  artifact,
  versions = [],
  diffLines = [],
  saving = false,
  onSave,
  onRestore,
}: {
  artifact?: Artifact;
  versions?: Version[];
  diffLines?: DiffLine[];
  saving?: boolean;
  onSave?: (content: string) => void;
  onRestore?: (version: number) => void;
}) {
  const [draft, setDraft] = useState(artifact?.content || "");
  const [activeTab, setActiveTab] = useState("code");
  useEffect(() => setDraft(artifact?.content || ""), [artifact?.id, artifact?.content]);
  const dirty = Boolean(artifact && draft !== artifact.content);
  const label = useMemo(() => artifact?.filePath || "Selecione um artefato", [artifact?.filePath]);

  if (!artifact) {
    return <div className="flex h-full min-h-80 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#11121a] p-8 text-center text-sm text-slate-500">Os arquivos gerados pelo agente aparecerão neste espaço.</div>;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#11121a] shadow-2xl shadow-black/15">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-2.5">
        <Code2 className="h-4 w-4 text-violet-300" />
        <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{artifact.title}</p><p className="truncate text-[11px] text-slate-500">{label} · v{artifact.version}</p></div>
        <div className="ml-auto flex items-center gap-1">
          {dirty && <span className="hidden text-[11px] text-amber-300 sm:inline">Alterações não salvas</span>}
          <Button size="sm" disabled={!dirty || saving} onClick={() => onSave?.(draft)} className="h-8 gap-1.5 bg-violet-500 text-xs hover:bg-violet-400"><Save className="h-3.5 w-3.5" />Salvar</Button>
        </div>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-10 w-full shrink-0 justify-start rounded-none border-b border-white/10 bg-transparent px-2">
          <TabsTrigger value="code" className="gap-1.5 text-xs"><Code2 className="h-3.5 w-3.5" />Código</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" />Preview</TabsTrigger>
          <TabsTrigger value="changes" className="gap-1.5 text-xs"><GitCompareArrows className="h-3.5 w-3.5" />Diff</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs"><Clock3 className="h-3.5 w-3.5" />Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="code" className="mt-0 min-h-0 flex-1 p-0"><textarea aria-label={`Editar ${artifact.filePath}`} spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)} className="h-full min-h-72 w-full resize-none bg-[#0b0c12] p-4 font-mono text-[13px] leading-6 text-slate-200 outline-none" /></TabsContent>
        <TabsContent value="preview" className="mt-0 min-h-0 flex-1 p-3"><ArtifactPreview content={draft} mode={artifact.previewMode} title={artifact.title} /></TabsContent>
        <TabsContent value="changes" className="mt-0 min-h-0 flex-1 overflow-auto bg-[#0b0c12] p-3 font-mono text-xs leading-6">
          {diffLines.length ? diffLines.map((line, index) => <div key={`${line.type}-${index}`} className={line.type === "add" ? "bg-emerald-400/10 text-emerald-200" : line.type === "remove" ? "bg-rose-400/10 text-rose-200" : "text-slate-400"}><span className="mr-3 inline-block w-10 select-none text-right text-slate-600">{line.beforeLine || line.afterLine || ""}</span><span className="mr-2">{line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}</span>{line.value || " "}</div>) : <p className="p-4 font-sans text-sm text-slate-500">Selecione duas versões para visualizar as mudanças.</p>}
        </TabsContent>
        <TabsContent value="history" className="mt-0 min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-2">{versions.map(version => <div key={version.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.025] p-3"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-400/10 text-xs font-semibold text-violet-200">v{version.version}</div><div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-200">{version.summary}</p><p className="mt-0.5 text-[11px] text-slate-500">{new Date(version.createdAt).toLocaleString()}</p></div><Button variant="ghost" size="sm" onClick={() => onRestore?.(version.version)} className="h-8 gap-1.5 text-xs text-slate-300 hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button></div>)}</div>
          {!versions.length && <p className="p-4 text-center text-sm text-slate-500">O histórico será criado conforme o arquivo evolui.</p>}
        </TabsContent>
      </Tabs>
      {saving && <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2 text-xs text-violet-200"><Check className="h-3.5 w-3.5 animate-pulse" />Atualizando o checkpoint do artefato…</div>}
    </section>
  );
}
