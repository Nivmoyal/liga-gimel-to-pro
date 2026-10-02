import { ChevronLeft, Dices } from 'lucide-react';
import type { EventChoice, Player } from '../../types/game';
import { ATTR_LABEL } from '../../data/sports';
import { successChance } from '../../services/eventEngine';

interface ChoiceButtonProps {
  choice: EventChoice;
  index: number;
  player: Player;
  onChoose: (index: number) => void;
}

/** A decision option. Skill-check options show the attribute and estimated success chance. */
export function ChoiceButton({ choice, index, player, onChoose }: ChoiceButtonProps) {
  const isCheck = Boolean(choice.stat && choice.fail);
  const chance = isCheck ? successChance(choice, player) : 100;
  const chanceColor = chance >= 65 ? 'text-emerald-600' : chance >= 40 ? 'text-amber-600' : 'text-rose-600';
  const barColor = chance >= 65 ? 'bg-emerald-500' : chance >= 40 ? 'bg-brand' : 'bg-rose-500';
  return (
    <button
      onClick={() => onChoose(index)}
      className="group w-full rounded-2xl border border-line bg-card p-3.5 text-right transition hover:border-brand/50 hover:bg-card-2 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-sm font-black text-brand">
          {index + 1}
        </span>
        <span className="flex-1 font-semibold leading-snug">{choice.label}</span>
        <ChevronLeft size={18} className="shrink-0 text-muted transition group-hover:text-brand" />
      </div>
      {isCheck && choice.stat && (
        <div className="mt-2.5 pr-10">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted">
              <Dices size={13} />
              {ATTR_LABEL[player.sport][choice.stat]} {player.attributes[choice.stat]}
            </span>
            <span className={`font-bold ${chanceColor}`}>סיכוי {chance}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className={`h-full ${barColor}`} style={{ width: `${chance}%` }} />
          </div>
        </div>
      )}
    </button>
  );
}
