import type { ReactNode } from 'react';
import type { GameState } from '../../types/game';
import { clubAbbr } from '../../data/clubIdentity';
import { SceneArt } from './SceneArt';
import { matchPaints } from './paints';

interface SceneBannerProps {
  state: GameState;
  scene?: string;
  height?: number;
  children?: ReactNode;
}

/** Rounded illustration banner tinted with the current teams' colors. */
export function SceneBanner({ state, scene, height = 150, children }: SceneBannerProps) {
  const { team, opp } = matchPaints(state);
  const label = state.currentMatch?.national ? 'ישראל' : clubAbbr(state.player.club);
  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-line bg-card-2">
      <SceneArt
        scene={scene ?? (state.player.sport === 'football' ? 'field' : 'field')}
        sport={state.player.sport}
        team={team}
        opp={opp}
        number={state.player.shirtNumber}
        label={label}
        height={height}
      />
      {children}
    </div>
  );
}
