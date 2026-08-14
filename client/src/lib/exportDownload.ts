export type ExportFormat = "markdown" | "pdf";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function plainPdfText(markdown: string) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/```[^\n]*/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

export function downloadMarkdown(markdown: string, fileName: string) {
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), fileName);
}

export async function downloadPdf(markdown: string, fileName: string, title: string) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const margin = 16;
  const width = 210 - margin * 2;
  const height = 297 - margin;
  let cursor = margin;

  document.setProperties({ title, subject: "Exportação do Lunex 1.2", creator: "Lunex 1.2" });
  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  const titleLines = document.splitTextToSize(title, width) as string[];
  document.text(titleLines, margin, cursor);
  cursor += titleLines.length * 7 + 4;
  document.setFont("helvetica", "normal");
  document.setFontSize(9.5);

  for (const paragraph of plainPdfText(markdown).split("\n")) {
    const lines = document.splitTextToSize(paragraph || " ", width) as string[];
    for (const line of lines) {
      if (cursor > height) {
        document.addPage();
        cursor = margin;
      }
      document.text(line, margin, cursor);
      cursor += 4.7;
    }
    cursor += 1.2;
  }

  document.save(fileName);
}
