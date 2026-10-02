interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  /** 'level' colors by value (good/warn/bad); 'gold' is a neutral progress bar. */
  tone?: 'level' | 'gold';
  /** Fraction (0..1) towards the next whole point, shown as a thin bar. */
  next?: number;
}

export function StatBar({ label, value, max = 100, suffix = '', tone = 'level', next }: StatBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = tone === 'gold' ? 'bg-brand' : pct >= 70 ? 'bg-emerald-500' : pct >= 45 ? 'bg-brand' : 'bg-rose-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-bold tabular-nums">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {next !== undefined && (
        <div className="mt-1 flex items-center gap-1.5" title="התקדמות לנקודה הבאה">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-line/60">
            <div className="h-full rounded-full bg-sun/70 transition-all" style={{ width: `${Math.round(next * 100)}%` }} />
          </div>
          <span className="w-8 text-left text-[10px] tabular-nums text-muted">{Math.round(next * 100)}%</span>
        </div>
      )}
    </div>
  );
}
