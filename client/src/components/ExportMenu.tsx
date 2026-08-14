import { Download, FileDown, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { ExportFormat } from "@/lib/exportDownload";

export function ExportMenu({ onExport, disabled = false, pending = false, subject = "conteúdo" }: { onExport: (format: ExportFormat) => void; disabled?: boolean; pending?: boolean; subject?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={disabled || pending} className="h-8 w-8 text-muted-foreground" aria-label={`Exportar ${subject}`}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => onExport("markdown")}>
          <FileText className="mr-2 h-4 w-4" /> Exportar Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onExport("pdf")}>
          <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
