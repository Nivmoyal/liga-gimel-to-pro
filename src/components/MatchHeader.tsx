import type { GameState } from '../types/game';
import { SURFACE_LABEL } from '../data/sports';
import { NATIONAL_TEAM_NAME } from '../data/national';
import { ROLE_LABEL } from '../services/matchEngine';
import { Crest } from './art/Crest';

/** Compact fixture banner shown on top of every match-phase modal. */
export function MatchHeader({ state }: { state: GameState }) {
  const match = state.currentMatch;
  if (!match) return null;
  const { player } = state;
  const mine = match.national ? 'ישראל' : player.club;
  const home = match.home ? mine : match.opponent;
  const away = match.home ? match.opponent : mine;
  const side = (name: string, align: 'start' | 'end') => (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'end' ? 'flex-row-reverse text-left' : ''}`}>
      <Crest name={name} size={30} className="shrink-0" />
      <span className={`truncate text-sm font-extrabold ${name === mine ? 'text-brand' : ''}`}>{name}</span>
    </div>
  );
  return (
    <div className="mb-3 rounded-2xl border border-line bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
        <span>{match.national ? NATIONAL_TEAM_NAME[match.national] : `מחזור ${state.matchday + 1}`} | {SURFACE_LABEL[player.sport]}</span>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 font-bold text-brand">{ROLE_LABEL[match.role]}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {side(home, 'start')}
        <span className="shrink-0 rounded-md bg-card-2 px-1.5 py-0.5 text-[10px] font-bold text-muted">נגד</span>
        {side(away, 'end')}
      </div>
    </div>
  );
}
