import { CheckCircle2, Target } from 'lucide-react';
import type { GameState } from '../types/game';
import { goalStatus, goalsOf } from '../services/careerEngine';

/** The coach's goals for the season, with progress so far. */
export function GoalsCard({ state }: { state: GameState }) {
  const statuses = goalsOf(state).map((g) => goalStatus(state, g));
  return (
    <section className="rounded-2xl border border-line bg-card p-3">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
        <Target size={16} className="text-brand" />
        יעדי העונה מהמאמן
      </h2>
      <ul className="space-y-2">
        {statuses.map(({ goal, current, done, share }) => (
          <li key={goal.label}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className={`flex items-center gap-1 ${done ? 'font-bold text-emerald-400' : ''}`}>
                {done && <CheckCircle2 size={13} />}
                {goal.label}
              </span>
              <span className="shrink-0 text-muted" dir="ltr">
                {goal.kind === 'position' ? (current ? `#${current}` : '-') : goal.kind === 'rating' ? current.toFixed(2) : `${current}/${goal.target}`}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-brand'}`} style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted">כל יעד שתעמוד בו בסוף העונה: בונוס כספי ואמון של המאמן.</p>
    </section>
  );
}
