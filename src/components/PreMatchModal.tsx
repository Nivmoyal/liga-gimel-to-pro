import { ChevronLeft } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { getParsedEvent } from '../state/gameLogic';
import { ChoiceButton } from './ui/ChoiceButton';
import { OutcomeBox } from './ui/OutcomeBox';
import { GoldButton } from './ui/GoldButton';
import { GameCard } from './ui/GameCard';
import { MatchHeader } from './MatchHeader';

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
    <GameCard
      label="לפני השריקה"
      scene={event.scene ?? 'locker'}
      seed={event.id}
      sport={state.player.sport}
      badge="לפני השריקה"
      kicker={
        <>
          <MatchHeader state={state} />
          {match.info && (
            <div className="mt-1 text-[11px] text-muted">
              {match.info.kickoff} | {match.info.venue} | {match.info.weatherLabel} | {match.info.attendance.toLocaleString('he-IL')} צופים
              {match.info.derby ? ' | דרבי!' : ''}
            </div>
          )}
          <div className="mt-2 text-brand">{event.speaker}</div>
        </>
      }
      title={event.title}
      text={event.text}
      footer={
        outcome ? (
          <GoldButton onClick={() => dispatch({ type: 'PRE_CONTINUE' })}>
            יוצאים למשחק
            <ChevronLeft size={18} />
          </GoldButton>
        ) : undefined
      }
    >
      {outcome ? (
        <OutcomeBox outcome={outcome} sport={state.player.sport} position={state.player.position} />
      ) : (
        <div className="space-y-2.5">
          {event.choices.map((choice, i) => (
            <ChoiceButton key={i} choice={choice} index={i} player={state.player} onChoose={(index) => dispatch({ type: 'PRE_CHOICE', index })} />
          ))}
        </div>
      )}
    </GameCard>
  );
}
