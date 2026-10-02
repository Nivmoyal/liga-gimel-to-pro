import { ChevronLeft, Inbox, MessageSquare } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { getParsedEvent } from '../state/gameLogic';
import { ChoiceButton } from './ui/ChoiceButton';
import { OutcomeBox } from './ui/OutcomeBox';

interface DecisionBoxProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/** "הודעה מחכה לתשובה שלך" - the interactive life-event card on the dashboard. */
export function DecisionBox({ state, dispatch }: DecisionBoxProps) {
  const event = getParsedEvent(state, state.pendingLifeEventId);

  if (!event) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-card/50 p-4 text-muted">
        <Inbox size={20} />
        <p className="text-sm">אין הודעות חדשות. זה הזמן להתאמן, לעבוד או לנוח לפני המחזור.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-card p-4 shadow-lg shadow-amber-500/5">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {!state.lifeOutcome && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <h2 className="text-sm font-extrabold text-gold">הודעה מחכה לתשובה שלך</h2>
      </div>
      <div className="mb-3 flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-2 text-gold">
          <MessageSquare size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted">{event.speaker}</div>
          <div className="font-extrabold">{event.title}</div>
          <p className="mt-1 leading-relaxed text-white/90">{event.text}</p>
        </div>
      </div>
      {state.lifeOutcome ? (
        <div className="space-y-3">
          <OutcomeBox outcome={state.lifeOutcome} sport={state.player.sport} />
          <button
            onClick={() => dispatch({ type: 'LIFE_DISMISS' })}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-card py-2.5 text-sm font-bold hover:border-amber-500/60"
          >
            הבנתי, ממשיכים
            <ChevronLeft size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {event.choices.map((choice, i) => (
            <ChoiceButton key={i} choice={choice} index={i} player={state.player} onChoose={(index) => dispatch({ type: 'LIFE_CHOICE', index })} />
          ))}
        </div>
      )}
    </section>
  );
}
