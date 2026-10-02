import type { GameState } from '../types/game';
import { SURFACE_LABEL } from '../data/sports';
import { ROLE_LABEL } from '../services/matchEngine';

/** Compact fixture banner shown on top of every match-phase modal. */
export function MatchHeader({ state }: { state: GameState }) {
  const match = state.currentMatch;
  if (!match) return null;
  const { player } = state;
  const home = match.home ? player.club : match.opponent;
  const away = match.home ? match.opponent : player.club;
  return (
    <div className="mb-4 rounded-2xl border border-line bg-gradient-to-l from-card-2 to-card p-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
        <span>
          מחזור {state.matchday + 1} | {SURFACE_LABEL[player.sport]}
        </span>
        <span className="rounded-full bg-pitch px-2 py-0.5 font-bold text-gold">{ROLE_LABEL[match.role]}</span>
      </div>
      <div className="flex items-center justify-between gap-2 text-sm font-extrabold">
        <span className={`flex-1 truncate ${home === player.club ? 'text-gold' : ''}`}>{home}</span>
        <span className="shrink-0 text-xs text-muted">נגד</span>
        <span className={`flex-1 truncate text-left ${away === player.club ? 'text-gold' : ''}`}>{away}</span>
      </div>
    </div>
  );
}
