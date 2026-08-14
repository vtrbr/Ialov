import { Fragment } from "react";

const TOKEN_PATTERN = /(\/\/.*$|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|class|interface|type|public|private|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/gm;

function CodeLine({ line }: { line: string }) {
  return <>{line.split(TOKEN_PATTERN).filter(Boolean).map((token, index) => {
    const className = token.startsWith("//") || token.startsWith("#") ? "text-slate-500" : token.startsWith("\"") || token.startsWith("'") || token.startsWith("`") ? "text-emerald-300" : /^(const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|class|interface|type|public|private)$/.test(token) ? "text-violet-300" : /^\d/.test(token) || /^(true|false|null|undefined)$/.test(token) ? "text-amber-300" : "text-slate-200";
    return <span className={className} key={`${token}-${index}`}>{token}</span>;
  })}</>;
}

function TextBlock({ value }: { value: string }) {
  return <>{value.split("\n").map((line, index) => line.trim() ? <p className="mb-2 last:mb-0" key={`${line}-${index}`}>{line}</p> : <div className="h-2" key={`space-${index}`} />)}</>;
}

/** Renderização deliberadamente limitada: markdown textual e blocos de código sem injetar HTML do agente. */
export function MarkdownMessage({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g).filter(Boolean);
  return <div className="break-words">{blocks.map((block, index) => {
    const match = block.match(/^```([^\n]*)\n?([\s\S]*?)```$/);
    if (!match) return <TextBlock key={`text-${index}`} value={block} />;
    const [, language = "code", source = ""] = match;
    return <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0a0b10]" key={`code-${index}`}><div className="border-b border-white/[.08] bg-white/[.025] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.13em] text-slate-500">{language || "code"}</div><pre className="overflow-x-auto p-3 text-xs leading-6"><code>{source.split("\n").map((line, lineIndex) => <Fragment key={`${line}-${lineIndex}`}><CodeLine line={line} />{lineIndex < source.split("\n").length - 1 ? "\n" : null}</Fragment>)}</code></pre></div>;
  })}</div>;
}
