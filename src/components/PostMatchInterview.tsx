import { ChevronLeft, Mic } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { getParsedEvent } from '../state/gameLogic';
import { SURFACE_LABEL } from '../data/sports';
import { Sheet } from './ui/Sheet';
import { ChoiceButton } from './ui/ChoiceButton';
import { OutcomeBox } from './ui/OutcomeBox';
import { GoldButton } from './ui/GoldButton';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

/** Media questions on the sideline after the game; affects fan reputation and morale. */
export function PostMatchInterview({ state, dispatch }: Props) {
  const match = state.currentMatch;
  const event = getParsedEvent(state, match?.postEventId ?? null);
  if (!match || !event) return null;
  const outcome = match.pendingOutcome;
  return (
    <Sheet
      title="ראיון אחרי המשחק"
      subtitle={`בצד ${SURFACE_LABEL[state.player.sport]}`}
      icon={Mic}
      footer={
        outcome ? (
          <GoldButton onClick={() => dispatch({ type: 'POST_CONTINUE' })}>
            סיום המחזור
            <ChevronLeft size={18} />
          </GoldButton>
        ) : undefined
      }
    >
      <div className="mb-4 flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
          <Mic size={22} />
        </div>
        <div>
          <div className="text-xs font-bold text-gold">{event.speaker}</div>
          <h3 className="text-lg font-black">{event.title}</h3>
          <p className="mt-1 leading-relaxed text-white/90">{event.text}</p>
        </div>
      </div>
      {outcome ? (
        <OutcomeBox outcome={outcome} sport={state.player.sport} />
      ) : (
        <div className="space-y-2">
          {event.choices.map((choice, i) => (
            <ChoiceButton key={i} choice={choice} index={i} player={state.player} onChoose={(index) => dispatch({ type: 'POST_CHOICE', index })} />
          ))}
        </div>
      )}
    </Sheet>
  );
}
