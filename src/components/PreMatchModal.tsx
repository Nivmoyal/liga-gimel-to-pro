import { ChevronLeft, DoorOpen } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { getParsedEvent } from '../state/gameLogic';
import { Sheet } from './ui/Sheet';
import { ChoiceButton } from './ui/ChoiceButton';
import { OutcomeBox } from './ui/OutcomeBox';
import { GoldButton } from './ui/GoldButton';
import { MatchHeader } from './MatchHeader';
import { SceneBanner } from './art/SceneBanner';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

/** Locker room / coach / management dialogue before kick-off. */
export function PreMatchModal({ state, dispatch }: Props) {
  const match = state.currentMatch;
  const event = getParsedEvent(state, match?.preEventId ?? null);
  if (!match || !event) return null;
  const outcome = match.pendingOutcome;
  return (
    <Sheet
      title="לפני השריקה"
      subtitle="חדר ההלבשה"
      icon={DoorOpen}
      footer={
        outcome ? (
          <GoldButton onClick={() => dispatch({ type: 'PRE_CONTINUE' })}>
            יוצאים למשחק
            <ChevronLeft size={18} />
          </GoldButton>
        ) : undefined
      }
    >
      <MatchHeader state={state} />
      <SceneBanner state={state} scene={event.scene} />
      <div className="mb-4">
        <div className="text-xs font-bold text-brand">{event.speaker}</div>
        <h3 className="mb-1 text-xl font-black">{event.title}</h3>
        <p className="leading-relaxed text-ink/80">{event.text}</p>
      </div>
      {outcome ? (
        <OutcomeBox outcome={outcome} sport={state.player.sport} />
      ) : (
        <div className="space-y-2">
          {event.choices.map((choice, i) => (
            <ChoiceButton key={i} choice={choice} index={i} player={state.player} onChoose={(index) => dispatch({ type: 'PRE_CHOICE', index })} />
          ))}
        </div>
      )}
    </Sheet>
  );
}
