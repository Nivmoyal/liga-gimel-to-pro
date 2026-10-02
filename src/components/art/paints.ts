import type { GameState } from '../../types/game';
import { clubIdentity } from '../../data/clubIdentity';
import { NATIONAL_OPPONENTS } from '../../data/national';
import type { TeamPaint } from './SceneArt';

export const ISRAEL_PAINT: TeamPaint = { shirt: '#ffffff', shorts: '#0038b8' };

export function clubPaint(name: string): TeamPaint {
  const national = [...NATIONAL_OPPONENTS.football, ...NATIONAL_OPPONENTS.basketball].find((n) => n.name === name);
  if (national) return { shirt: national.colors[0], shorts: national.colors[1] };
  const { colors } = clubIdentity(name);
  return { shirt: colors.primary, shorts: colors.secondary };
}

/** Colors of the player's side and the opponent for the current context. */
export function matchPaints(state: GameState): { team: TeamPaint; opp: TeamPaint } {
  const match = state.currentMatch;
  const team = match?.national ? ISRAEL_PAINT : clubPaint(state.player.club);
  const oppName = match?.opponent ?? state.nationalCallUp?.opponent;
  return { team, opp: oppName ? clubPaint(oppName) : { shirt: '#64748b', shorts: '#334155' } };
}
