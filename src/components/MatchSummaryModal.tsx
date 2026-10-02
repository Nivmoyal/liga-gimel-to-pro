import { ChevronLeft, CircleCheck, CircleX, Trophy, Whistle } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { Sheet } from './ui/Sheet';
import { GoldButton } from './ui/GoldButton';
import { MatchHeader } from './MatchHeader';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

const OUTCOME_LABEL = { win: 'ניצחון', draw: 'תיקו', loss: 'הפסד' } as const;
const OUTCOME_COLOR = { win: 'text-emerald-400', draw: 'text-amber-400', loss: 'text-rose-400' } as const;

export function MatchSummaryModal({ state, dispatch }: Props) {
  const match = state.currentMatch;
  const result = match?.result;
  if (!match || !result) return null;
  const { player } = state;
  const football = player.sport === 'football';
  const lines = football
    ? [
        { label: 'שערים', value: match.playerGoals },
        { label: 'בישולים', value: match.playerAssists },
      ]
    : [
        { label: 'נקודות', value: match.playerPoints },
        { label: 'ריבאונדים', value: match.playerRebounds },
        { label: 'אסיסטים', value: match.playerAssists },
      ];

  return (
    <Sheet
      title="שריקת הסיום"
      subtitle="סיכום המשחק"
      icon={Whistle}
      footer={
        <GoldButton onClick={() => dispatch({ type: 'SUMMARY_CONTINUE' })}>
          {match.role === 'injured' ? 'סיום המחזור' : 'למסיבת העיתונאים'}
          <ChevronLeft size={18} />
        </GoldButton>
      }
    >
      <MatchHeader state={state} />
      <div className="mb-4 rounded-2xl border border-line bg-card p-4 text-center">
        <div className={`text-sm font-black ${OUTCOME_COLOR[result.outcome]}`}>
          {OUTCOME_LABEL[result.outcome]}
          {result.overtime ? ' (אחרי הארכה)' : ''}
        </div>
        <div className="my-1 flex items-center justify-center gap-4 text-5xl font-black tabular-nums">
          <span>{match.home ? result.teamScore : result.oppScore}</span>
          <span className="text-2xl text-muted">:</span>
          <span>{match.home ? result.oppScore : result.teamScore}</span>
        </div>
        <div className="text-xs text-muted">
          {match.home ? `${player.club} - ${match.opponent}` : `${match.opponent} - ${player.club}`}
        </div>
      </div>

      {result.rating !== null ? (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="col-span-1 rounded-xl border border-amber-500/50 bg-amber-500/10 p-2 text-center">
            <div className="text-2xl font-black text-gold">{result.rating.toFixed(1)}</div>
            <div className="text-[10px] text-muted">ציון</div>
          </div>
          {lines.map((l) => (
            <div key={l.label} className="rounded-xl border border-line bg-card p-2 text-center">
              <div className="text-2xl font-black">{l.value}</div>
              <div className="text-[10px] text-muted">{l.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-4 rounded-xl bg-card p-3 text-center text-sm text-muted">
          {match.role === 'injured' ? 'צפית במשחק מהיציע בגלל הפציעה.' : 'המאמן השאיר אותך על הספסל כל המשחק.'}
        </p>
      )}

      {result.motm && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500 p-3 font-black text-black">
          <Trophy size={20} />
          שחקן המשחק!
        </div>
      )}

      {match.log.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-muted">הרגעים שלך</h3>
          <ul className="space-y-2">
            {match.log.map((entry) => (
              <li key={entry.eventId} className="flex gap-2 rounded-xl bg-card p-2.5 text-sm">
                {entry.success ? (
                  <CircleCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" />
                ) : (
                  <CircleX size={18} className="mt-0.5 shrink-0 text-rose-400" />
                )}
                <div>
                  <div className="font-bold">{entry.title}</div>
                  <div className="text-xs text-muted">{entry.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
