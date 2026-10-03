import { BookOpen, ChevronLeft, Inbox, MessageSquare } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { getParsedEvent } from '../state/gameLogic';
import { ChoiceButton } from './ui/ChoiceButton';
import { OutcomeBox } from './ui/OutcomeBox';
import { ScenePhoto } from './art/ScenePhoto';

interface DecisionBoxProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

/** "הודעה מחכה לתשובה שלך" - the interactive life-event card on the dashboard. */
export function DecisionBox({ state, dispatch }: DecisionBoxProps) {
  const event = getParsedEvent(state, state.pendingLifeEventId);
  // Chapters of this season's storyline are marked as such.
  const chapter = /^story_.+_(\d)$/.exec(event?.id ?? '')?.[1];

  if (!event) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-card/50 p-4 text-muted">
        <Inbox size={20} />
        <p className="text-sm">אין הודעות חדשות. זה הזמן להתאמן, לעבוד או לנוח לפני המחזור.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-brand/40 bg-card p-4 shadow-lg shadow-black/40">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {!state.lifeOutcome && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
        </span>
        <h2 className="text-sm font-extrabold text-brand">הודעה מחכה לתשובה שלך</h2>
        {chapter && (
          <span className="ms-auto flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
            <BookOpen size={12} />
            סיפור העונה {chapter}/3
          </span>
        )}
      </div>
      <ScenePhoto scene={event.scene ?? 'phone'} seed={event.id} sport={state.player.sport} height={150} className="-mx-4 -mt-4 mb-3" />
      <div className="mb-3 flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-2 text-brand">
          <MessageSquare size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted">{event.speaker}</div>
          <div className="font-extrabold">{event.title}</div>
          <p className="mt-1 leading-relaxed text-ink/80">{event.text}</p>
        </div>
      </div>
      {state.lifeOutcome ? (
        <div className="space-y-3">
          <OutcomeBox outcome={state.lifeOutcome} sport={state.player.sport} position={state.player.position} />
          <button
            onClick={() => dispatch({ type: 'LIFE_DISMISS' })}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-line bg-card py-2.5 text-sm font-bold hover:border-brand/50"
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
