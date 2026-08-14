const brandMark = "/manus-storage/lunex-1-2-mark_2bd19678.png";

export function LunexBrand({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} aria-label="Lunex 1.2">
      <img src={brandMark} alt="" className="h-8 w-8 rounded-[10px] object-cover shadow-[0_0_24px_rgba(124,92,255,.25)]" />
      {!compact && <div className="leading-none"><span className="text-[15px] font-semibold tracking-[-0.04em] text-white">lunex</span><span className="ml-1 text-[10px] font-medium text-violet-300">1.2</span></div>}
    </div>
  );
}

export function LunexSplash() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090a10]">
      <div className="absolute h-80 w-80 rounded-full bg-violet-600/20 blur-[100px]" />
      <div className="relative flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
        <img src={brandMark} alt="Lunex 1.2" className="h-20 w-20 rounded-[26px] shadow-[0_0_56px_rgba(124,92,255,.45)]" />
        <div className="text-center"><p className="text-2xl font-semibold tracking-[-0.05em] text-white">lunex <span className="text-violet-300">1.2</span></p><p className="mt-1.5 text-xs text-slate-500">Preparando o seu estúdio de agentes</p></div>
      </div>
    </div>
  );
}
