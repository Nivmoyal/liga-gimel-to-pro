import { CalendarClock, Briefcase, Dumbbell, Sofa } from 'lucide-react';
import type { GameState, WeekPlan } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { TRAINING_OPTIONS, LIFESTYLE_OPTIONS } from '../data/activities';
import { getJob } from '../data/jobs';
import { DEFAULT_WEEK_PLAN, isNonPro } from '../state/gameLogic';
import { formatMoney } from '../services/playerUtils';

const RECOVERY: WeekPlan['recovery'][] = ['rest', 'family', 'physio', 'friends'];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active ? 'border-brand bg-brand text-black' : 'border-line bg-card-2 text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The week on autopilot: pick once how many shifts, which training and what
 * kind of recovery, and every slot not used by hand is filled before the match.
 */
export function WeekPlanCard({ state, dispatch }: { state: GameState; dispatch: (a: GameAction) => void }) {
  const { player } = state;
  const plan = { ...DEFAULT_WEEK_PLAN, ...state.weekPlan };
  const job = getJob(player.jobId);
  const working = Boolean(job) && isNonPro(player);
  const set = (p: Partial<WeekPlan>) => dispatch({ type: 'SET_WEEK_PLAN', plan: p });
  const keeper = player.position === 'GK';
  return (
    <section className="rounded-2xl border border-line bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-extrabold">
          <CalendarClock size={17} className="text-brand" />
          שגרת השבוע
        </h2>
        <span className="text-[11px] text-muted">{state.weekSlots} משבצות פנויות</span>
      </div>
      <p className="mb-3 text-xs text-muted">מה שלא תעשה ידנית יקרה לבד כשתעלה למשחק. אפשר לשנות בכל שבוע.</p>

      {working && (
        <div className="mb-2.5">
          <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted">
            <Briefcase size={12} /> משמרות ב{job!.name} ({formatMoney(job!.payPerShift + state.flags.jobRaise)} למשמרת)
          </div>
          <div className="flex gap-1.5">
            {[1, 2].map((n) => (
              <Chip key={n} active={plan.shifts === n} onClick={() => set({ shifts: n })}>
                {n === 1 ? 'משמרת אחת' : 'שתי משמרות'}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mb-2.5">
        <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted">
          <Dumbbell size={12} /> אימון
        </div>
        <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
          <Chip active={plan.training === 'auto'} onClick={() => set({ training: 'auto' })}>
            לפי העמדה
          </Chip>
          {TRAINING_OPTIONS.map((o) => (
            <Chip key={o.id} active={plan.training === o.id} onClick={() => set({ training: o.id })}>
              {keeper && o.keeperLabel ? o.keeperLabel.split(':')[0] : o.label[player.sport]}
              {o.budgetCost > 0 ? ` (${formatMoney(o.budgetCost)})` : ''}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-muted">
          <Sofa size={12} /> כשנגמר הכוח
        </div>
        <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {RECOVERY.map((id) => {
            const o = LIFESTYLE_OPTIONS.find((l) => l.id === id)!;
            return (
              <Chip key={id} active={plan.recovery === id} onClick={() => set({ recovery: id })}>
                {o.label}
                {o.budgetCost > 0 ? ` (${formatMoney(o.budgetCost)})` : ''}
              </Chip>
            );
          })}
        </div>
      </div>
    </section>
  );
}
