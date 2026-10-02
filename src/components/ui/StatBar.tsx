interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  /** 'level' colors by value (good/warn/bad); 'gold' is a neutral progress bar. */
  tone?: 'level' | 'gold';
}

export function StatBar({ label, value, max = 100, suffix = '', tone = 'level' }: StatBarProps) {
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
    </div>
  );
}
