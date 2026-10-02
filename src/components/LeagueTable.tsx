import type { LeagueTeam, SportType } from '../types/game';

interface LeagueTableProps {
  teams: LeagueTeam[];
  sport: SportType;
  compact?: boolean;
  /** Promotion / relegation markers are hidden in top or bottom divisions. */
  canPromote?: boolean;
  canRelegate?: boolean;
}

export function LeagueTable({ teams, sport, compact = false, canPromote = true, canRelegate = true }: LeagueTableProps) {
  const football = sport === 'football';
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-card-2 text-[11px] text-muted">
          <tr>
            <th className="py-2 pr-2 text-right font-semibold">#</th>
            <th className="py-2 text-right font-semibold">קבוצה</th>
            <th className="px-1 py-2 font-semibold">מש׳</th>
            {!compact && <th className="px-1 py-2 font-semibold">נצ׳</th>}
            {!compact && football && <th className="px-1 py-2 font-semibold">ת׳</th>}
            {!compact && <th className="px-1 py-2 font-semibold">הפ׳</th>}
            <th className="px-1 py-2 font-semibold">הפרש</th>
            <th className="py-2 pl-2 font-semibold">נק׳</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const pos = i + 1;
            const promo = canPromote && pos <= 2;
            const releg = canRelegate && pos >= teams.length - 1;
            const diff = t.scored - t.conceded;
            return (
              <tr
                key={t.name}
                className={`border-t border-line ${t.isPlayerClub ? 'bg-amber-500/15 font-bold text-gold' : i % 2 ? 'bg-card' : 'bg-pitch'}`}
              >
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-4 w-1 rounded-full ${promo ? 'bg-emerald-500' : releg ? 'bg-rose-500' : 'bg-transparent'}`} />
                    {pos}
                  </span>
                </td>
                <td className="max-w-[9rem] truncate py-2">{t.name}</td>
                <td className="px-1 py-2 text-center tabular-nums">{t.played}</td>
                {!compact && <td className="px-1 py-2 text-center tabular-nums">{t.won}</td>}
                {!compact && football && <td className="px-1 py-2 text-center tabular-nums">{t.drawn}</td>}
                {!compact && <td className="px-1 py-2 text-center tabular-nums">{t.lost}</td>}
                <td className="px-1 py-2 text-center tabular-nums" dir="ltr">
                  {diff > 0 ? `+${diff}` : diff}
                </td>
                <td className="py-2 pl-2 text-center font-bold tabular-nums">{t.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
