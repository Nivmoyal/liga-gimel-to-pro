import type { GameState } from '../types/game';
import { NATIONAL_TEAM_NAME } from '../data/national';
import { CUP_NAME, CUP_ROUNDS } from '../data/cup';
import { ROLE_LABEL } from '../services/matchEngine';
import { Crest } from './art/Crest';

/** One-line fixture: crest, teams, competition and the player's role. */
export function MatchHeader({ state }: { state: GameState }) {
  const match = state.currentMatch;
  if (!match) return null;
  const { player } = state;
  const mine = match.national ? 'ישראל' : player.club;
  const home = match.home ? mine : match.opponent;
  const away = match.home ? match.opponent : mine;
  return (
    <span className="inline-flex max-w-full flex-col items-center gap-1">
      <span className="inline-flex max-w-full items-center gap-1.5 text-xs font-bold text-ink/85">
        <Crest name={home} size={18} className="shrink-0" />
        <span className={`truncate ${home === mine ? 'text-brand' : ''}`}>{home}</span>
        <span className="text-muted">נגד</span>
        <span className={`truncate ${away === mine ? 'text-brand' : ''}`}>{away}</span>
        <Crest name={away} size={18} className="shrink-0" />
      </span>
      <span className="text-[11px] text-muted">
        {match.national ? NATIONAL_TEAM_NAME[match.national] : match.cup !== undefined ? `${CUP_NAME} | ${CUP_ROUNDS[match.cup].name}` : `מחזור ${state.matchday + 1}`} | {ROLE_LABEL[match.role]}
        {player.isCaptain && !match.national ? ' | קפטן' : ''}
      </span>
    </span>
  );
}
