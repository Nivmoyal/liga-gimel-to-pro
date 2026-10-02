import { Brain, Dumbbell, Footprints, Target, UserRound, Zap, Coins } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { TRAINING_OPTIONS } from '../../data/activities';
import type { TrainingId } from '../../data/activities';
import { ATTR_KEYS, ATTR_LABEL } from '../../data/sports';
import { calcOvr, formatMoney } from '../../services/playerUtils';
import { Sheet } from '../ui/Sheet';
import { StatBar } from '../ui/StatBar';

const ICONS: Record<TrainingId, LucideIcon> = {
  fitness: Footprints,
  skills: Target,
  tactical: Brain,
  mental: Zap,
  private: UserRound,
};

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function TrainingSheet({ state, dispatch, onClose }: Props) {
  const { player } = state;
  const labels = ATTR_LABEL[player.sport];
  return (
    <Sheet title="אימונים" subtitle={`דירוג כללי ${calcOvr(player)} | פוטנציאל משוער ${player.potential - 3}-${player.potential + 3}`} icon={Dumbbell} onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-2xl border border-line bg-card p-3">
        {ATTR_KEYS.map((k) => (
          <StatBar key={k} label={labels[k]} value={player.attributes[k]} max={99} tone="gold" />
        ))}
      </div>
      <p className="mb-2 text-xs text-muted">כל אימון לוקח משבצת זמן אחת מתוך השבוע. אימון במצב עייפות מעלה סיכון לפציעה.</p>
      <div className="space-y-2">
        {TRAINING_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.id];
          const disabled = state.weekSlots <= 0 || player.energy < opt.energyCost || player.budget < opt.budgetCost || player.injuryWeeks > 0;
          const gains = Object.keys(opt.gains).length
            ? (Object.keys(opt.gains) as Array<keyof typeof opt.gains>).map((k) => labels[k]).join(', ')
            : 'התכונות המרכזיות לעמדה';
          return (
            <button
              key={opt.id}
              disabled={disabled}
              onClick={() => dispatch({ type: 'TRAIN', option: opt.id })}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-right transition hover:border-amber-500/60 disabled:opacity-40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-gold">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{opt.label[player.sport]}</div>
                <div className="text-xs text-muted">{gains}</div>
              </div>
              <div className="shrink-0 space-y-0.5 text-left text-xs">
                <div className="flex items-center gap-1 text-rose-300">
                  <Zap size={12} />-{opt.energyCost}%
                </div>
                {opt.budgetCost > 0 && (
                  <div className="flex items-center gap-1 text-amber-300">
                    <Coins size={12} />
                    {formatMoney(opt.budgetCost)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
