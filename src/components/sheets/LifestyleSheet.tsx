import { Bed, Coins, HeartPulse, ShoppingBag, Sofa, Users, Utensils, House, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { LIFESTYLE_OPTIONS } from '../../data/activities';
import type { LifestyleId } from '../../data/activities';
import { formatMoney } from '../../services/playerUtils';
import { Sheet } from '../ui/Sheet';
import { StatBar } from '../ui/StatBar';

const ICONS: Record<LifestyleId, LucideIcon> = {
  rest: Bed,
  physio: HeartPulse,
  nutrition: Utensils,
  friends: Users,
  family: House,
  gear: ShoppingBag,
};

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function LifestyleSheet({ state, dispatch, onClose }: Props) {
  const { player, flags } = state;
  return (
    <Sheet title="סגנון חיים" subtitle="מה שקורה מחוץ למגרש משפיע עליו" icon={Sofa} onClose={onClose}>
      <div className="mb-4 space-y-2.5 rounded-2xl border border-line bg-card p-3">
        <StatBar label="אנרגיה" value={player.energy} suffix="%" />
        <StatBar label="ביטחון עצמי" value={player.confidence} />
        <StatBar label="מורל קבוצתי" value={player.teamMorale} />
      </div>
      <div className="space-y-2">
        {LIFESTYLE_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.id];
          const owned = opt.oneTime && flags.ownsBoots;
          const disabled = owned || state.weekSlots <= 0 || player.budget < opt.budgetCost || (opt.energy < 0 && player.energy < -opt.energy);
          return (
            <button
              key={opt.id}
              disabled={disabled}
              onClick={() => dispatch({ type: 'LIFESTYLE', option: opt.id })}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-right transition hover:border-brand/50 disabled:opacity-40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold">
                  {opt.label}
                  {owned ? ' (נרכש)' : ''}
                </div>
                <div className="text-xs text-muted">{opt.description}</div>
              </div>
              <div className="shrink-0 space-y-0.5 text-left text-xs">
                {opt.energy !== 0 && (
                  <div className={`flex items-center gap-1 ${opt.energy > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <Zap size={12} />
                    <span dir="ltr">
                      {opt.energy > 0 ? '+' : ''}
                      {opt.energy}%
                    </span>
                  </div>
                )}
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
