import { ArrowDown, ArrowUp, ChevronLeft, Medal, Trophy } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { divisionName, topDivision } from '../data/sports';
import { Sheet } from './ui/Sheet';
import { GoldButton } from './ui/GoldButton';
import { LeagueTable } from './LeagueTable';
import { StatsGrid } from './views/StatsView';
import { ScenePhoto } from './art/ScenePhoto';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

export function SeasonEndModal({ state, dispatch }: Props) {
  const summary = state.seasonSummary;
  if (!summary) return null;
  const { player } = state;
  return (
    <Sheet
      title={`סיום עונה ${summary.season}`}
      subtitle={`${player.club} | ${divisionName(player.sport, player.division)}`}
      icon={Medal}
      footer={
        <GoldButton onClick={() => dispatch({ type: 'SEASON_CONTINUE' })}>
          לחלון ההעברות של הקיץ
          <ChevronLeft size={18} />
        </GoldButton>
      }
    >
      <ScenePhoto scene={summary.champion || summary.promoted ? 'trophy' : 'stadium'} sport={player.sport} height={170} className="mb-4 rounded-2xl" />
      <div className="mb-4 rounded-2xl border border-line bg-card p-4 text-center">
        <div className="text-sm text-muted">מקום סופי</div>
        <div className="text-5xl font-black text-brand">{summary.finalPosition}</div>
        {summary.champion && (
          <div className="mt-2 flex items-center justify-center gap-2 font-black text-amber-300">
            <Trophy size={18} />
            אלופים!
          </div>
        )}
        {summary.promoted && (
          <div className="mt-2 flex items-center justify-center gap-2 font-bold text-emerald-400">
            <ArrowUp size={18} />
            עולים ל{divisionName(player.sport, player.division + 1)}
          </div>
        )}
        {summary.relegated && (
          <div className="mt-2 flex items-center justify-center gap-2 font-bold text-rose-400">
            <ArrowDown size={18} />
            יורדים ל{divisionName(player.sport, player.division - 1)}
          </div>
        )}
      </div>
      <h3 className="mb-2 font-extrabold">הנתונים שלך</h3>
      <div className="mb-4">
        <StatsGrid stats={summary.stats} sport={player.sport} />
      </div>
      <h3 className="mb-2 font-extrabold">טבלה סופית</h3>
      <LeagueTable
        teams={summary.table}
        sport={player.sport}
        compact
        canPromote={player.division < topDivision(player.sport)}
        canRelegate={player.division > 0}
      />
    </Sheet>
  );
}
