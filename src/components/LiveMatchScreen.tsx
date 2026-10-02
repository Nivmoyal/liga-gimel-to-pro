import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Flame, Goal, Info, Megaphone, RectangleVertical, Repeat2, SkipForward, Thermometer, Timer, Users, Volleyball, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState, TimelineEntry } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { NATIONAL_TEAM_NAME } from '../data/national';
import { formatClock, scoreAt } from '../services/matchEngine';
import { nextLiveStop } from '../state/gameLogic';
import { ScenePhoto } from './art/ScenePhoto';
import { Crest } from './art/Crest';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  paused: boolean;
}

const SPEEDS = [1, 2, 4] as const;

const KIND_ICON: Record<TimelineEntry['kind'], LucideIcon> = {
  goal: Goal,
  score: Volleyball,
  chance: Zap,
  card: RectangleVertical,
  sub: ArrowLeftRight,
  period: Timer,
  info: Info,
  moment: Flame,
  run: Repeat2,
  highlight: Megaphone,
};

/** The match as it happens: scoreboard, running clock and commentary. */
export function LiveMatchScreen({ state, dispatch, paused }: Props) {
  const match = state.currentMatch!;
  const { player } = state;
  const sport = player.sport;
  const [clock, setClock] = useState(match.clock);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const dispatched = useRef(false);
  const stop = nextLiveStop(match);
  const perTick = (sport === 'football' ? 0.3 : 0.13) * speed;

  // Resync after a decision or overtime changes the match.
  useEffect(() => {
    setClock((c) => Math.max(c, match.clock));
    dispatched.current = false;
  }, [match.clock, match.inGameIndex, match.totalMinutes]);

  useEffect(() => {
    if (paused || state.phase !== 'live') return;
    const id = setInterval(() => {
      setClock((c) => {
        const next = Math.min(stop.minute, c + perTick);
        if (next >= stop.minute && !dispatched.current) {
          dispatched.current = true;
          setTimeout(() => dispatch({ type: 'LIVE_ADVANCE' }), 450);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [paused, state.phase, stop.minute, perTick, dispatch]);

  const skip = () => {
    if (dispatched.current) return;
    dispatched.current = true;
    setClock(stop.minute);
    dispatch({ type: 'LIVE_ADVANCE' });
  };

  const mine = match.national ? 'ישראל' : player.club;
  const home = match.home ? mine : match.opponent;
  const away = match.home ? match.opponent : mine;
  const score = scoreAt(match.timeline, clock);
  const homeScore = match.home ? score.team : score.opp;
  const awayScore = match.home ? score.opp : score.team;
  const feed = useMemo(
    () => match.timeline.filter((e) => !e.hidden && e.minute <= clock).reverse(),
    [match.timeline, clock],
  );
  const info = match.info;

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-pitch">
      <ScenePhoto scene="stadium" sport={sport} seed={info?.venue} height={210} fade={false}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-pitch" />
        <div className="absolute inset-x-0 top-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="text-center text-[11px] font-bold text-white/80">
            {match.national ? NATIONAL_TEAM_NAME[match.national] : `מחזור ${state.matchday + 1}`} | {info?.venue}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex w-24 flex-col items-center gap-1">
              <Crest name={home} size={44} />
              <span className={`w-full truncate text-center text-xs font-black ${home === mine ? 'text-brand' : 'text-white'}`}>{home}</span>
            </div>
            <div className="text-center">
              <div key={`${homeScore}-${awayScore}`} className="animate-sheet text-5xl font-black tabular-nums text-white drop-shadow-lg">
                {homeScore} <span className="text-white/50">:</span> {awayScore}
              </div>
              <span className="mt-1 inline-block rounded-full border-2 border-brand bg-black/60 px-3 py-0.5 text-sm font-black tabular-nums text-brand">
                {formatClock(clock, sport, match.totalMinutes)}
              </span>
            </div>
            <div className="flex w-24 flex-col items-center gap-1">
              <Crest name={away} size={44} />
              <span className={`w-full truncate text-center text-xs font-black ${away === mine ? 'text-brand' : 'text-white'}`}>{away}</span>
            </div>
          </div>
        </div>
      </ScenePhoto>

      {info && (
        <div className="flex items-center justify-center gap-3 border-b border-line px-4 pb-2 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {info.attendance.toLocaleString('he-IL')}
          </span>
          <span className="flex items-center gap-1">
            <Thermometer size={12} />
            {info.weatherLabel}
          </span>
          <span>שופט: {info.referee}</span>
        </div>
      )}

      <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
        {feed.map((e, i) => {
          const Icon = KIND_ICON[e.kind];
          if (e.kind === 'period') {
            const s = scoreAt(match.timeline, e.minute);
            return (
              <div key={i} className="flex items-center gap-2 py-1 text-xs font-bold text-muted">
                <span className="h-px flex-1 bg-line" />
                {e.text} | {match.home ? `${s.team}:${s.opp}` : `${s.opp}:${s.team}`}
                <span className="h-px flex-1 bg-line" />
              </div>
            );
          }
          const scoring = e.team > 0 || e.opp > 0;
          return (
            <div
              key={i}
              className={`animate-sheet flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                e.mine ? 'border-brand/60 bg-brand/10' : scoring && e.kind === 'goal' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-line bg-card'
              }`}
            >
              <span className="w-12 shrink-0 text-xs font-black tabular-nums text-brand">{formatClock(e.minute, sport, match.totalMinutes).split(' | ').pop()}</span>
              <Icon size={15} className={`mt-0.5 shrink-0 ${e.side === 'opp' ? 'text-rose-400' : e.side === 'team' ? 'text-emerald-400' : 'text-muted'}`} />
              <span className={`leading-snug ${e.mine ? 'font-bold text-ink' : 'text-ink/85'}`}>{e.text}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-line bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`chamfer rounded-md px-3 py-2 text-sm font-black ${speed === s ? 'bg-brand text-black' : 'bg-card-2 text-muted'}`}
            >
              x{s}
            </button>
          ))}
        </div>
        <button onClick={skip} disabled={paused} className="btn-gold flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-black">
          <SkipForward size={16} />
          {stop.decision ? 'לרגע הבא שלך' : 'לשריקת הסיום'}
        </button>
      </div>
    </div>
  );
}
