import { useEffect, useMemo, useState } from "react";
import { Clock3, Code2, Eye, GitCompareArrows, RotateCcw, Save } from "lucide-react";
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

export function workspacePreviewBinding(content: string, mode: Artifact["previewMode"]) {
  return { content, mode };
}

export function ArtifactWorkspace({
  artifact,
  versions = [],
  diffLines = [],
  saving = false,
  activeTab: controlledTab,
  onActiveTabChange,
  onSave,
  onRestore,
}: {
  artifact?: Artifact;
  versions?: Version[];
  diffLines?: DiffLine[];
  saving?: boolean;
  activeTab?: "code" | "preview" | "changes" | "history";
  onActiveTabChange?: (tab: "code" | "preview" | "changes" | "history") => void;
  onSave?: (content: string) => void;
  onRestore?: (version: number) => void;
}) {
  const [draft, setDraft] = useState(artifact?.content || "");
  const [internalTab, setInternalTab] = useState<"code" | "preview" | "changes" | "history">("code");
  const activeTab = controlledTab || internalTab;
  useEffect(() => setDraft(artifact?.content || ""), [artifact?.id, artifact?.content]);
  const dirty = Boolean(artifact && draft !== artifact.content);
  const label = useMemo(() => artifact?.filePath || "Selecione um artefato", [artifact?.filePath]);

  if (!artifact) {
    return <div className="flex h-full min-h-80 items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Os arquivos gerados pelo agente aparecerão neste espaço.</div>;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-3 py-2.5">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{artifact.title}</p><p className="truncate text-[11px] text-muted-foreground">{label} · v{artifact.version}</p></div>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="hidden text-[11px] text-muted-foreground sm:inline">Não salvo</span>}
          <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={() => onSave?.(draft)} className="h-7 gap-1.5 text-xs"><Save className="h-3.5 w-3.5" />Salvar</Button>
        </div>
      </header>
      <Tabs value={activeTab} onValueChange={value => { const tab = value as "code" | "preview" | "changes" | "history"; setInternalTab(tab); onActiveTabChange?.(tab); }} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="h-9 w-full shrink-0 justify-start rounded-none border-b border-border bg-transparent px-2">
          <TabsTrigger value="code" className="gap-1.5 text-xs"><Code2 className="h-3.5 w-3.5" />Código</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" />Preview</TabsTrigger>
          <TabsTrigger value="changes" className="gap-1.5 text-xs"><GitCompareArrows className="h-3.5 w-3.5" />Diff</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs"><Clock3 className="h-3.5 w-3.5" />Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="code" className="mt-0 min-h-0 flex-1 p-0"><textarea aria-label={`Editar ${artifact.filePath}`} spellCheck={false} value={draft} onChange={event => setDraft(event.target.value)} className="h-full min-h-72 w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-foreground outline-none" /></TabsContent>
        <TabsContent value="preview" className="mt-0 min-h-0 flex-1 p-3"><ArtifactPreview {...workspacePreviewBinding(draft, artifact.previewMode)} title={artifact.title} /></TabsContent>
        <TabsContent value="changes" className="mt-0 min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-6">
          {diffLines.length ? diffLines.map((line, index) => <div key={`${line.type}-${index}`} className={line.type === "add" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : line.type === "remove" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "text-muted-foreground"}><span className="mr-3 inline-block w-10 select-none text-right text-muted-foreground/60">{line.beforeLine || line.afterLine || ""}</span><span className="mr-2">{line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}</span>{line.value || " "}</div>) : <p className="p-4 font-sans text-sm text-muted-foreground">Selecione duas versões para visualizar as mudanças.</p>}
        </TabsContent>
        <TabsContent value="history" className="mt-0 min-h-0 flex-1 overflow-auto p-3">
          <div className="space-y-2">{versions.map(version => <div key={version.id} className="flex items-center gap-3 rounded-lg border border-border p-3"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-medium text-foreground">v{version.version}</div><div className="min-w-0 flex-1"><p className="truncate text-xs text-foreground">{version.summary}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</p></div><Button variant="ghost" size="sm" onClick={() => onRestore?.(version.version)} className="h-7 gap-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button></div>)}</div>
          {!versions.length && <p className="p-4 text-center text-sm text-muted-foreground">O histórico será criado conforme o arquivo evolui.</p>}
        </TabsContent>
      </Tabs>
      {saving && <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">Salvando checkpoint…</div>}
    </section>
  );
}
