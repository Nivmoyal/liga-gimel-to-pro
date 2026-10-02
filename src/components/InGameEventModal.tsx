import { ChevronLeft, Flame, Lightbulb, Timer } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { getParsedEvent } from '../state/gameLogic';
import { SURFACE_LABEL } from '../data/sports';
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
    <Sheet
      title={`רגע מכריע על ${SURFACE_LABEL[state.player.sport]}`}
      subtitle={`מצב ${match.inGameIndex + 1} מתוך ${total}`}
      icon={Flame}
      footer={
        outcome ? (
          <GoldButton onClick={() => dispatch({ type: 'INGAME_CONTINUE' })}>
            {isLast ? 'לשריקת הסיום' : 'ממשיכים במשחק'}
            <ChevronLeft size={18} />
          </GoldButton>
        ) : undefined
      }
    >
      <MatchHeader state={state} />
      <SceneBanner state={state} scene={event.scene} />
      <div className="mb-3 flex items-center gap-2">
        {event.clock && (
          <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-600">
            <Timer size={13} />
            {event.clock}
          </span>
        )}
        {event.clutch && <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-black text-white">רגע הכרעה</span>}
        <div className="mr-auto flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i < match.inGameIndex ? 'bg-emerald-500' : i === match.inGameIndex ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
      </div>
      <h3 className="mb-1 text-xl font-black">{event.title}</h3>
      <p className="mb-3 leading-relaxed text-ink/80">{event.text}</p>
      {event.tip && !outcome && (
        <div className="mb-4 flex gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
          <Lightbulb size={18} className="shrink-0 text-sky-700" />
          <div>
            <div className="text-xs font-bold text-sky-700">טיפ הסקאוט</div>
            <p className="leading-snug text-ink/80">{event.tip}</p>
          </div>
        </div>
      )}
      {outcome ? (
        <OutcomeBox outcome={outcome} sport={state.player.sport} />
      ) : (
        <div className="space-y-2">
          {event.choices.map((choice, i) => (
            <ChoiceButton key={i} choice={choice} index={i} player={state.player} onChoose={(index) => dispatch({ type: 'INGAME_CHOICE', index })} />
          ))}
        </div>
      )}
    </Sheet>
  );
}
