import { CircleAlert, Play } from 'lucide-react';
import type { GameState } from '../types/game';
import { CTA_LABEL } from '../data/sports';
import { fixtureFor } from '../services/leagueEngine';
import { matchdayBlocker, nextFixtureInfo } from '../state/gameLogic';

interface MainCTAProps {
  state: GameState;
  onStart: () => void;
}

/** Full-width gold button that advances the matchday. */
export function MainCTA({ state, onStart }: MainCTAProps) {
  const blocker = matchdayBlocker(state);
  const fixture = fixtureFor(state.league, state.matchday);
  const opponent = state.league.teams[fixture.opponentIndex]?.name ?? '';
  const info = nextFixtureInfo(state);
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-30 bg-gradient-to-t from-pitch via-pitch/95 to-transparent px-4 pb-2 pt-5">
      <div className="mx-auto max-w-md">
        {blocker && (
          <div className="mb-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-[#2a1719] px-3 py-1.5 text-xs font-bold text-rose-400">
            <CircleAlert size={14} />
            {blocker}
          </div>
        )}
        <button
          onClick={onStart}
          disabled={Boolean(blocker)}
          className="flex w-full items-center justify-between gap-3 btn-gold rounded-md px-5 py-3.5 shadow-xl shadow-black/50 transition active:scale-[0.99]"
        >
          <div className="text-right">
            <div className="text-lg font-black leading-tight">{CTA_LABEL[state.player.sport]}</div>
            <div className="text-xs font-semibold opacity-75">
              מחזור {state.matchday + 1} | {fixture.home ? 'בבית' : 'בחוץ'} מול {opponent}
            </div>
            <div className="text-[11px] font-semibold opacity-70">
              {info.kickoff} | {info.venue}{info.derby ? ' | דרבי' : ''}
            </div>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/15">
            <Play size={20} fill="currentColor" />
          </div>
        </button>
      </div>
    </div>
  );
}
