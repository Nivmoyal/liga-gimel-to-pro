import { Goal, HeartPulse, Volleyball } from 'lucide-react';
import type { GameState } from '../types/game';
import { SPORT_LABEL, WEEK_SLOTS, positionLabel } from '../data/sports';
import { clubIdentity } from '../data/clubIdentity';
import { Jersey } from './art/Jersey';

/** Shows the active sport, position and how much free time is left this week. */
export function SportIndicator({ state }: { state: GameState }) {
  const { player } = state;
  const Icon = player.sport === 'football' ? Goal : Volleyball;
  const { colors } = clubIdentity(player.club);
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-card px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <Jersey primary={colors.primary} secondary={colors.secondary} name={player.name} number={player.shirtNumber} sport={player.sport} captain={player.isCaptain} width={40} />
        <div>
          <div className="flex items-center gap-1 text-[11px] text-muted">
            <Icon size={12} className="text-brand" />
            ענף פעיל
          </div>
          <div className="font-extrabold">
            {SPORT_LABEL[player.sport]} <span className="font-medium text-muted">| {positionLabel(player.position)}</span>
          </div>
        </div>
      </div>
      <div className="text-left">
        {player.injuryWeeks > 0 ? (
          <div className="flex items-center gap-1 text-xs font-bold text-rose-400">
            <HeartPulse size={14} />
            פצוע ({player.injuryWeeks})
          </div>
        ) : (
          <>
            <div className="text-[11px] text-muted">זמן פנוי השבוע</div>
            <div className="mt-1 flex justify-end gap-1" aria-label={`נותרו ${state.weekSlots} פעולות`}>
              {Array.from({ length: WEEK_SLOTS }, (_, i) => (
                <span key={i} className={`h-2 w-5 rounded-full ${i < state.weekSlots ? 'bg-brand' : 'bg-line'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
