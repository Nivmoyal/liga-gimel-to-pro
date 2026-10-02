import type { EventChoice, Player } from '../../types/game';
import { ATTR_LABEL } from '../../data/sports';
import { successChance } from '../../services/eventEngine';

interface ChoiceButtonProps {
  choice: EventChoice;
  index: number;
  player: Player;
  onChoose: (index: number) => void;
}

/** Gold chamfered answer button. Skill checks show the attribute and the estimated odds. */
export function ChoiceButton({ choice, index, player, onChoose }: ChoiceButtonProps) {
  const isCheck = Boolean(choice.stat && choice.fail);
  const chance = isCheck ? successChance(choice, player) : 100;
  const chanceColor = chance >= 65 ? 'text-emerald-400' : chance >= 40 ? 'text-amber-300' : 'text-rose-400';
  return (
    <button
      onClick={() => onChoose(index)}
      className="btn-gold w-full rounded-md px-4 py-3 text-center transition active:scale-[0.99]"
    >
      <span className="block text-base font-black leading-snug">{choice.label}</span>
      {isCheck && choice.stat && (
        <span className="mt-1 flex items-center justify-center gap-2 text-xs font-bold text-black/70">
          {ATTR_LABEL[player.sport][choice.stat]} {player.attributes[choice.stat]}
          <span className={`rounded bg-black/80 px-1.5 py-0.5 ${chanceColor}`}>סיכוי {chance}%</span>
        </span>
      )}
    </button>
  );
}
