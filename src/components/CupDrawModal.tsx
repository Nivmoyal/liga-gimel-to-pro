import { Swords, Trophy } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { CUP_NAME, CUP_ROUNDS } from '../data/cup';
import { divisionName } from '../data/sports';
import { formatMoney } from '../services/playerUtils';
import { Sheet } from './ui/Sheet';
import { GoldButton } from './ui/GoldButton';
import { Crest } from './art/Crest';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

/** The draw for the next State Cup round, played in midweek. */
export function CupDrawModal({ state, dispatch }: Props) {
  const cup = state.cup;
  if (!cup?.opponent) return null;
  const { player } = state;
  const round = CUP_ROUNDS[cup.round];
  const oppDivision = cup.opponentDivision ?? player.division;
  const higher = oppDivision > player.division;
  const prize = Math.round(round.prize * (1 + player.division * 0.5));
  const home = cup.home ? player.club : cup.opponent;
  const away = cup.home ? cup.opponent : player.club;
  return (
    <Sheet
      title={CUP_NAME}
      subtitle={`${round.name} | משחק אמצע שבוע`}
      icon={Trophy}
      footer={
        <GoldButton onClick={() => dispatch({ type: 'CUP_PLAY' })}>
          <Swords size={18} />
          יוצאים למשחק הגביע
        </GoldButton>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
        {[home, away].map((name) => (
          <div key={name} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <Crest name={name} size={44} />
            <span className={`truncate font-black ${name === player.club ? 'text-brand' : ''}`}>{name}</span>
            <span className="text-[11px] text-muted">{divisionName(player.sport, name === player.club ? player.division : oppDivision)}</span>
          </div>
        ))}
      </div>
      <p className="leading-relaxed">
        {higher
          ? `ההגרלה הפגישה את ${player.club} עם ${cup.opponent}, קבוצה מליגה גבוהה יותר. בגביע הכול יכול לקרות, וזו ההזדמנות להראות לכולם מי אתם.`
          : `ההגרלה הפגישה את ${player.club} עם ${cup.opponent}. מי שמנצח ממשיך, מי שמפסיד יוצא.`}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl bg-card p-2">
          <div className="text-[11px] text-muted">מענק עלייה לשלב הבא</div>
          <div className="font-bold text-amber-300">{formatMoney(prize)}</div>
        </div>
        <div className="rounded-xl bg-card p-2">
          <div className="text-[11px] text-muted">{player.sport === 'football' ? 'בתיקו' : 'בשוויון'}</div>
          <div className="font-bold">{player.sport === 'football' ? 'הכרעה בפנדלים' : 'הארכה'}</div>
        </div>
      </div>
      {cup.results.length > 0 && (
        <div className="mt-3 rounded-2xl border border-line bg-card p-3 text-sm">
          <div className="mb-1 text-xs text-muted">הדרך עד כאן</div>
          {cup.results.map((r) => (
            <div key={r.round} className="flex justify-between">
              <span>{CUP_ROUNDS[r.round].name}: {r.opponent}</span>
              <span dir="ltr" className="font-bold text-emerald-400">{r.score}{r.penalties ? ' (פנ׳)' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
