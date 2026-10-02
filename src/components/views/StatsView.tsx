import { ChartColumn, Medal, Target, TrendingUp } from 'lucide-react';
import type { GameState, SeasonStats, SportType } from '../../types/game';
import { divisionName, topDivision } from '../../data/sports';
import { sortedTable } from '../../services/leagueEngine';
import { averageRating } from '../../services/playerUtils';
import { LeagueTable } from '../LeagueTable';

export function statCells(stats: SeasonStats, sport: SportType) {
  const avg = averageRating(stats);
  const per = (v: number) => (stats.apps ? (v / stats.apps).toFixed(1) : '0.0');
  return sport === 'football'
    ? [
        { label: 'הופעות', value: String(stats.apps) },
        { label: 'שערים', value: String(stats.goals) },
        { label: 'בישולים', value: String(stats.assists) },
        { label: 'ציון ממוצע', value: avg ? avg.toFixed(2) : '-' },
        { label: 'הרכב פותח', value: String(stats.starts) },
        { label: 'משחקי 8+', value: String(stats.motm) },
      ]
    : [
        { label: 'הופעות', value: String(stats.apps) },
        { label: 'נק׳ למשחק', value: per(stats.points) },
        { label: 'ריב׳ למשחק', value: per(stats.rebounds) },
        { label: 'אס׳ למשחק', value: per(stats.assists) },
        { label: 'ציון ממוצע', value: avg ? avg.toFixed(2) : '-' },
        { label: 'משחקי 8+', value: String(stats.motm) },
      ];
}

export function StatsGrid({ stats, sport }: { stats: SeasonStats; sport: SportType }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {statCells(stats, sport).map((c) => (
        <div key={c.label} className="rounded-xl border border-line bg-card p-2.5 text-center">
          <div className="text-xl font-black tabular-nums text-gold">{c.value}</div>
          <div className="text-[11px] text-muted">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

export function StatsView({ state }: { state: GameState }) {
  const { player, league } = state;
  const table = sortedTable(league);
  const stats = player.seasonStats;
  const record =
    player.sport === 'football'
      ? `${stats.wins} נצ׳ | ${stats.draws} ת׳ | ${stats.losses} הפ׳`
      : `${stats.wins} נצ׳ | ${stats.losses} הפ׳`;
  const canPromote = league.division < topDivision(player.sport);
  const canRelegate = league.division > 0;
  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <ChartColumn size={18} className="text-gold" />
          טבלת {divisionName(player.sport, league.division)}
        </h2>
        <LeagueTable teams={table} sport={player.sport} canPromote={canPromote} canRelegate={canRelegate} />
        <div className="mt-2 flex gap-3 text-[11px] text-muted">
          {canPromote && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> עולות ליגה
            </span>
          )}
          {canRelegate && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> יורדות ליגה
            </span>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Target size={18} className="text-gold" />
          העונה שלי
        </h2>
        <StatsGrid stats={stats} sport={player.sport} />
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <TrendingUp size={13} />
          במשחקים ששיחקת: {record}
        </p>
      </section>
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Medal size={18} className="text-gold" />
          קריירה
        </h2>
        <StatsGrid stats={player.careerStats} sport={player.sport} />
      </section>
    </div>
  );
}
