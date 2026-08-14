import { toast } from "sonner";
import { downloadMarkdown, downloadPdf, type ExportFormat } from "./exportDownload";

export type ExportPayload = { title: string; markdown: string; fileName: string };
export type { ExportFormat } from "./exportDownload";

export async function exportContent(payload: ExportPayload, format: ExportFormat) {
  try {
    if (format === "markdown") downloadMarkdown(payload.markdown, payload.fileName);
    else await downloadPdf(payload.markdown, payload.fileName.replace(/\.md$/i, ".pdf"), payload.title);
    toast.success(`Download em ${format === "pdf" ? "PDF" : "Markdown"} iniciado.`);
    return true;
  } catch {
    toast.error("Não foi possível preparar o arquivo para download.");
    return false;
  }
}
