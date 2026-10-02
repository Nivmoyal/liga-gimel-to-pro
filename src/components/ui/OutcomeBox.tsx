import { CircleCheck, CircleX, MessageSquare } from 'lucide-react';
import type { PendingOutcome, SportType } from '../../types/game';
import { describeEffects } from '../../services/playerUtils';

interface OutcomeBoxProps {
  outcome: PendingOutcome;
  sport: SportType;
}

export function OutcomeBox({ outcome, sport }: OutcomeBoxProps) {
  const effects = describeEffects(outcome.effects, sport);
  const tone = !outcome.skillCheck
    ? { border: 'border-line', icon: <MessageSquare size={18} className="text-brand" />, label: 'התוצאה' }
    : outcome.success
      ? { border: 'border-emerald-500/50', icon: <CircleCheck size={18} className="text-emerald-600" />, label: 'הצלחה' }
      : { border: 'border-rose-500/50', icon: <CircleX size={18} className="text-rose-600" />, label: 'כישלון' };
  return (
    <div className={`animate-sheet rounded-2xl border ${tone.border} bg-card p-4`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        {tone.icon}
        {tone.label}
      </div>
      <p className="leading-relaxed">{outcome.text}</p>
      {effects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {effects.map((e) => (
            <span
              key={e.label}
              className={`rounded-lg px-2 py-1 text-xs font-semibold ${e.positive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}
            >
              {e.label} <span dir="ltr">{e.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
