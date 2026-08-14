export function LunexBrand({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label="Lunex">
      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-foreground text-background text-xs font-semibold">L</div>
      {!compact && (
        <span className="text-sm font-medium tracking-tight text-foreground">
          lunex <span className="text-muted-foreground font-normal">1.2</span>
        </span>
      )}
    </div>
  );
}

export function LunexSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background text-sm font-semibold">L</div>
        <p className="text-sm text-muted-foreground">Preparando o seu estúdio…</p>
      </div>
    </div>
  );
}
