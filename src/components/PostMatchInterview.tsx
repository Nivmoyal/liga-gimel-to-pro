import { ChevronLeft } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { getParsedEvent } from '../state/gameLogic';
import { ChoiceButton } from './ui/ChoiceButton';
import { OutcomeBox } from './ui/OutcomeBox';
import { GoldButton } from './ui/GoldButton';
import { GameCard } from './ui/GameCard';

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
    <GameCard
      label="ראיון אחרי המשחק"
      scene={event.scene ?? 'press'}
      seed={event.id}
      sport={state.player.sport}
      badge="ראיון"
      kicker={<span className="text-brand">{event.speaker}</span>}
      title={event.title}
      text={event.text}
      footer={
        outcome ? (
          <GoldButton onClick={() => dispatch({ type: 'POST_CONTINUE' })}>
            סיום המחזור
            <ChevronLeft size={18} />
          </GoldButton>
        ) : undefined
      }
    >
      {outcome ? (
        <OutcomeBox outcome={outcome} sport={state.player.sport} />
      ) : (
        <div className="space-y-2.5">
          {event.choices.map((choice, i) => (
            <ChoiceButton key={i} choice={choice} index={i} player={state.player} onChoose={(index) => dispatch({ type: 'POST_CHOICE', index })} />
          ))}
        </div>
      )}
    </GameCard>
  );
}
