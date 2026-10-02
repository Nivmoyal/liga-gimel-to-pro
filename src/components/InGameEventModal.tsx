import { ChevronLeft, Lightbulb } from 'lucide-react';
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

/** "Clock" labels like "דקה 34" become a compact pill: "34׳ הזדמנות". */
function badgeFor(clock: string | undefined, clutch: boolean | undefined) {
  const label = clutch ? 'רגע הכרעה' : 'הזדמנות';
  if (!clock) return label;
  const minute = clock.match(/^דקה (.+)$/);
  return minute ? `${minute[1]}׳ ${label}` : `${clock} | ${label}`;
}

/** In-game decision scenario with a scouting tip and three skill-check actions. */
export function InGameEventModal({ state, dispatch }: Props) {
  const match = state.currentMatch;
  const eventId = match?.inGameEventIds[match.inGameIndex] ?? null;
  const event = getParsedEvent(state, eventId);
  if (!match || !event) return null;
  const outcome = match.pendingOutcome;
  const total = match.inGameEventIds.length;
  const isLast = match.inGameIndex >= total - 1;

  return (
    <GameCard
      label="רגע מכריע"
      scene={event.scene ?? 'field'}
      seed={event.id}
      sport={state.player.sport}
      badge={badgeFor(event.clock, event.clutch)}
      kicker={
        <>
          <MatchHeader state={state} />
          <div className="mt-2 flex justify-center gap-1">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1 w-6 rounded-full ${i < match.inGameIndex ? 'bg-emerald-500' : i === match.inGameIndex ? 'bg-brand' : 'bg-line'}`} />
            ))}
          </div>
        </>
      }
      title={event.title}
      text={event.text}
      footer={
        outcome ? (
          <GoldButton onClick={() => dispatch({ type: 'INGAME_CONTINUE' })}>
            {isLast ? 'לשריקת הסיום' : 'ממשיכים במשחק'}
            <ChevronLeft size={18} />
          </GoldButton>
        ) : undefined
      }
    >
      {outcome ? (
        <OutcomeBox outcome={outcome} sport={state.player.sport} position={state.player.position} />
      ) : (
        <>
          {event.tip && (
            <div className="mb-4 flex gap-2 rounded-xl border border-line bg-card-2 p-3 text-sm">
              <Lightbulb size={18} className="shrink-0 text-brand" />
              <p className="leading-snug text-ink/80">
                <span className="font-bold text-brand">המודיעין: </span>
                {event.tip}
              </p>
            </div>
          )}
          <p className="mb-2.5 text-center text-sm font-bold text-muted">מה עושים?</p>
          <div className="space-y-2.5">
            {event.choices.map((choice, i) => (
              <ChoiceButton key={i} choice={choice} index={i} player={state.player} onChoose={(index) => dispatch({ type: 'INGAME_CHOICE', index })} />
            ))}
          </div>
        </>
      )}
    </GameCard>
  );
}
