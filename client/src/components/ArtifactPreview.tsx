import { useMemo } from "react";
import { Eye, FileCode2 } from "lucide-react";

type ArtifactPreviewProps = {
  content: string;
  mode: "none" | "html" | "react";
  title?: string;
};

export const previewSandbox = "allow-scripts";

function documentShell(body: string, scripts = "") {
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' https:; connect-src 'none'; font-src https: data:" /><style>html,body,#root{min-height:100%;margin:0}body{font-family:ui-sans-serif,system-ui,sans-serif;color:#e8eaf5;background:#101119}</style></head><body>${body}${scripts}</body></html>`;
}

function reactDocument(source: string) {
  const withoutImports = source.replace(/^\s*import[\s\S]*?;\s*$/gm, "").replace(/export\s+default\s+/g, "");
  const match = withoutImports.match(/(?:function|class|const)\s+([A-Z][\w]*)/);
  const component = match?.[1] || "App";
  return documentShell(
    '<div id="root"></div>',
    `<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><script type="text/babel">try { ${withoutImports}\nconst RootComponent = typeof ${component} !== 'undefined' ? ${component} : App; ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RootComponent)); } catch (error) { document.getElementById('root').innerHTML = '<pre style="white-space:pre-wrap;padding:16px;color:#ffb4ab">Falha no preview React: ' + String(error.message || error) + '</pre>'; }</script>`
  );
}

export function buildPreviewDocument(content: string, mode: ArtifactPreviewProps["mode"]) {
  if (mode === "html") return documentShell(content);
  if (mode === "react") return reactDocument(content);
  return "";
}

export function ArtifactPreview({ content, mode, title = "Preview do artefato" }: ArtifactPreviewProps) {
  const srcDoc = useMemo(() => buildPreviewDocument(content, mode), [content, mode]);

  if (mode === "none") {
    return (
      <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-[#11121a] p-6 text-center text-slate-400">
        <FileCode2 className="h-7 w-7 text-slate-500" />
        <p className="text-sm">Este artefato não possui preview executável.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-52 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#11121a]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3 text-xs text-slate-400">
        <Eye className="h-3.5 w-3.5" />
        <span className="truncate">{title}</span>
        <span className="ml-auto rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300">isolado</span>
      </div>
      <iframe title={title} sandbox={previewSandbox} srcDoc={srcDoc} className="min-h-0 flex-1 bg-white" />
    </div>
  );
}
