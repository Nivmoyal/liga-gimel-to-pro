// ===================================================================
// Match engine: a live timeline. Kickoff builds the base match (goals or
// points spread over the minutes, named scorers, cards, subs, chances).
// The player's decisions slot in at their real minute and change the
// live score; the final result is read from the timeline.
// ===================================================================

import type {
  Effects,
  GameEvent,
  MatchInfoState,
  MatchResult,
  MatchRole,
  MatchState,
  Player,
  Position,
  SportType,
  TimelineEntry,
} from '../types/game';
import { calcOvr, clamp, randFloat, randInt } from './playerUtils';
import { simulateScore } from './leagueEngine';
import { BB, FB, fill, freshLine } from '../data/commentary';
import type { RosterPlayer } from './rosterEngine';

export function determineRole(player: Player): MatchRole {
  if (player.injuryWeeks > 0) return 'injured';
  if (player.coachApproval < 30 || player.energy < 15) return 'bench';
  if (player.coachApproval >= 50 && player.energy >= 30) return 'starter';
  return 'rotation';
}

export const ROLE_LABEL: Record<MatchRole, string> = {
  starter: 'בהרכב הפותח',
  rotation: 'נכנס מהספסל',
  bench: 'על הספסל',
  injured: 'פצוע',
};

export function inGameEventCount(role: MatchRole): number {
  if (role === 'starter') return Math.random() < 0.25 ? 3 : 2;
  if (role === 'rotation') return 1;
  return 0;
}

export function teamStrength(clubStrength: number, player: Player, role: MatchRole): number {
  const roleFactor = role === 'starter' ? 1 : role === 'rotation' ? 0.5 : 0;
  return clubStrength + (player.teamMorale - 50) * 0.08 + (calcOvr(player) - clubStrength) * 0.25 * roleFactor;
}

export function createMatchState(opponent: string, opponentStrength: number, home: boolean, role: MatchRole, info: MatchInfoState | null = null): MatchState {
  return {
    opponent,
    national: null,
    opponentStrength,
    home,
    role,
    preEventId: null,
    inGameEventIds: [],
    inGameIndex: 0,
    postEventId: null,
    clutch: false,
    log: [],
    playerGoals: 0,
    playerAssists: 0,
    playerPoints: 0,
    playerRebounds: 0,
    ratingDelta: 0,
    info,
    timeline: [],
    clock: 0,
    totalMinutes: 90,
    decisionMinutes: [],
    base: { goals: 0, assists: 0, points: 0, rebounds: 0 },
    extra: null,
    pendingOutcome: null,
    result: null,
  };
}

/** Tallies the player's own contribution from a decision (score changes go to the timeline). */
export function applyMatchEffects(match: MatchState, effects: Effects): MatchState {
  return {
    ...match,
    playerGoals: match.playerGoals + (effects.playerGoals ?? 0),
    playerPoints: match.playerPoints + (effects.playerPoints ?? 0),
    playerAssists: match.playerAssists + (effects.playerAssists ?? 0),
    playerRebounds: match.playerRebounds + (effects.playerRebounds ?? 0),
    ratingDelta: match.ratingDelta + (effects.rating ?? 0),
  };
}

// ------------------------------------------------------------------
// Clock helpers
// ------------------------------------------------------------------

const QUARTERS: Record<string, number> = { ראשון: 1, שני: 2, שלישי: 3, רביעי: 4 };

/** "דקה 90+2" -> 92, "רבע שלישי, 0:03" -> 29.95. */
export function parseClock(clock: string | undefined, sport: SportType): number | null {
  if (!clock) return null;
  if (sport === 'football') {
    const m = clock.match(/(\d+)(?:\+(\d+))?/);
    return m ? Number(m[1]) + Number(m[2] ?? 0) : null;
  }
  const q = Object.entries(QUARTERS).find(([word]) => clock.includes(word))?.[1];
  const t = clock.match(/(\d+):(\d+)/);
  if (!q || !t) return null;
  return (q - 1) * 10 + (10 - (Number(t[1]) + Number(t[2]) / 60));
}

export function formatClock(minute: number, sport: SportType, total: number): string {
  if (sport === 'football') {
    if (minute > 90) return `90+${Math.ceil(minute - 90)}׳`;
    if (minute > 45 && minute < 46) return '45׳';
    return `${Math.max(1, Math.ceil(minute))}׳`;
  }
  if (minute >= 40 && total > 40) {
    const left = Math.max(0, 45 - minute);
    return `הארכה ${Math.floor(left)}:${String(Math.round((left % 1) * 60)).padStart(2, '0')}`;
  }
  const q = Math.min(4, Math.floor(minute / 10) + 1);
  const left = Math.max(0, q * 10 - minute);
  return `רבע ${q} | ${Math.floor(left)}:${String(Math.floor((left % 1) * 60)).padStart(2, '0')}`;
}

/** Minutes for the decision moments: real clock when given, spread otherwise. */
export function planDecisionMinutes(events: GameEvent[], sport: SportType, role: MatchRole): number[] {
  const end = sport === 'football' ? 88 : 39;
  const start = role === 'rotation' ? (sport === 'football' ? 62 : 22) : sport === 'football' ? 8 : 3;
  const minutes: number[] = [];
  events.forEach((e, i) => {
    let m = parseClock(e.clock, sport);
    if (m === null || (role === 'rotation' && m < start && !e.clutch)) {
      m = start + ((end - start) * (i + 1)) / (events.length + 1);
    }
    minutes.push(m);
  });
  // Keep chronological order and at least a little space between moments.
  const order = minutes.map((m, i) => ({ m, i, clutch: Boolean(events[i].clutch) }));
  order.sort((a, b) => Number(a.clutch) - Number(b.clutch) || a.m - b.m);
  let last = -Infinity;
  for (const o of order) {
    if (o.m < last + 3) o.m = last + 3;
    last = o.m;
    minutes[o.i] = o.m;
  }
  return minutes;
}

export function scoreAt(timeline: TimelineEntry[], minute: number) {
  let team = 0;
  let opp = 0;
  for (const e of timeline) {
    if (e.minute <= minute) {
      team += e.team;
      opp += e.opp;
    }
  }
  return { team, opp };
}

// ------------------------------------------------------------------
// Kickoff: build the base timeline
// ------------------------------------------------------------------

const FOOTBALL_GOAL_FACTOR: Partial<Record<Position, number>> = {
  GK: 0, LB: 0.15, RB: 0.15, CB: 0.15, LWB: 0.22, RWB: 0.22, CDM: 0.25, CM: 0.5, CAM: 0.75, LW: 0.8, RW: 0.8, ST: 1,
};
const FOOTBALL_ASSIST_FACTOR: Partial<Record<Position, number>> = {
  GK: 0.03, LB: 0.55, RB: 0.55, CB: 0.15, LWB: 0.75, RWB: 0.75, CDM: 0.55, CM: 1, CAM: 1.2, LW: 0.9, RW: 0.9, ST: 0.5,
};
const BB_POINTS_FACTOR: Partial<Record<Position, number>> = { PG: 0.9, SG: 1.1, SF: 1, PF: 0.85, C: 0.8 };
const BB_REB_FACTOR: Partial<Record<Position, number>> = { PG: 0.4, SG: 0.5, SF: 0.8, PF: 1.2, C: 1.5 };
const BB_AST_FACTOR: Partial<Record<Position, number>> = { PG: 1.4, SG: 0.7, SF: 0.6, PF: 0.4, C: 0.35 };

const pickOne = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const QUARTER_NAMES = ['', 'ראשון', 'שני', 'שלישי', 'רביעי'];

export interface KickoffParams {
  player: Player;
  teamName: string;
  clubStrength: number;
  division: number;
  teamRoster: RosterPlayer[];
  oppRoster: RosterPlayer[];
  decisionMinutes: number[];
  clutchMinute: number | null;
}

/** Names from a roster, never the player's own slot. */
function rosterNames(roster: RosterPlayer[], filter?: (p: RosterPlayer) => boolean) {
  // Full names: surnames alone collide too often ("Ivanov shoots, Ivanov saves").
  const list = roster.filter((p) => (filter ? filter(p) : true)).map((p) => p.name);
  return list.length ? list : roster.map((p) => p.name);
}

export function kickoff(match: MatchState, params: KickoffParams): MatchState {
  const { player, teamName, clubStrength, division, teamRoster, oppRoster, decisionMinutes, clutchMinute } = params;
  const sport = player.sport;
  const playing = match.role === 'starter' || match.role === 'rotation';
  const ts = teamStrength(clubStrength, player, match.role);
  const sim = match.home ? simulateScore(sport, division, ts, match.opponentStrength) : simulateScore(sport, division, match.opponentStrength, ts);
  let team = match.home ? sim.home : sim.away;
  let opp = match.home ? sim.away : sim.home;

  const vars = {
    קבוצה: teamName,
    יריבה: match.opponent,
    אצטדיון: match.info?.venue ?? 'המגרש',
    קהל: (match.info?.attendance ?? 300).toLocaleString('he-IL'),
    שופט: match.info?.referee ?? 'השופט',
    מזג: match.info?.weatherLabel ?? '',
  };
  const me = player.name;
  const mates = rosterNames(teamRoster);
  const attackers = rosterNames(teamRoster, (p) => ['חלוץ', 'קשר', 'קיצוני', 'קלעי', 'סמול פורוורד', 'רכז', 'פאוור פורוורד'].includes(p.pos));
  const oppAttackers = rosterNames(oppRoster, (p) => p.pos !== 'שוער');
  const teamKeeper = rosterNames(teamRoster, (p) => p.pos === 'שוער')[0];
  const iAmKeeper = player.position === 'GK';
  const timeline: TimelineEntry[] = [];
  const add = (e: Omit<TimelineEntry, 'base'>) => timeline.push({ ...e, base: true });
  const busy = (m: number) => decisionMinutes.some((d) => Math.abs(d - m) < 1.5);
  const freeMinute = (lo: number, hi: number) => {
    for (let i = 0; i < 20; i++) {
      const m = randFloat(lo, hi);
      if (!busy(m)) return m;
    }
    return randFloat(lo, hi);
  };
  const lastBase = clutchMinute ?? Infinity;

  // Player's baseline contribution outside the decision moments
  const base = { goals: 0, assists: 0, points: 0, rebounds: 0 };
  const minutesFactor = match.role === 'starter' ? 1 : 0.5;
  if (playing && sport === 'football') {
    base.goals = Math.random() < (FOOTBALL_GOAL_FACTOR[player.position] ?? 0.3) * (player.attributes.attack / 100) * 0.3 * minutesFactor ? 1 : 0;
    team = Math.max(team, base.goals);
    base.assists = team - base.goals > 0 && Math.random() < (FOOTBALL_ASSIST_FACTOR[player.position] ?? 0.3) * (player.attributes.playmaking / 100) * 0.35 * minutesFactor ? 1 : 0;
  }
  if (playing && sport === 'basketball') {
    const mf = match.role === 'starter' ? 1 : 0.55;
    base.points = Math.max(0, Math.round((3 + player.attributes.attack * 0.14 * (BB_POINTS_FACTOR[player.position] ?? 1)) * mf + randInt(-3, 3)));
    base.rebounds = Math.max(0, Math.round((1 + player.attributes.physical * 0.06 * (BB_REB_FACTOR[player.position] ?? 1)) * mf + randInt(-1, 2)));
    base.assists = Math.max(0, Math.round((0.5 + player.attributes.playmaking * 0.05 * (BB_AST_FACTOR[player.position] ?? 1)) * mf + randInt(-1, 1)));
    team = Math.max(team, base.points + 20);
  }

  const rotationIn = match.role === 'rotation' ? (sport === 'football' ? randFloat(55, 65) : randFloat(14, 20)) : 0;
  const playerOnPitch = (m: number) => playing && m >= rotationIn;

  if (sport === 'football') {
    const stoppage = randInt(2, 6);
    const total = 90 + stoppage;
    add({ minute: 0, kind: 'info', side: 'neutral', text: fill(freshLine('fb.kickoff', FB.kickoff), vars), team: 0, opp: 0 });
    const weatherLine = (FB as Record<string, string[]>)[match.info?.weather ?? ''];
    if (weatherLine) add({ minute: freeMinute(20, 40), kind: 'info', side: 'neutral', text: fill(freshLine(`fb.${match.info?.weather}`, weatherLine), vars), team: 0, opp: 0 });

    // Goals
    let playerGoalsLeft = base.goals;
    let playerAssistsLeft = base.assists;
    for (let i = 0; i < team; i++) {
      const minute = freeMinute(3, Math.min(total - 1, lastBase - 2));
      const byMe = playerGoalsLeft > 0 && playerOnPitch(minute);
      if (byMe) playerGoalsLeft--;
      const scorer = byMe ? me : pickOne(attackers);
      let text = fill(freshLine('fb.goalTeam', FB.goalTeam), { ...vars, שם: scorer });
      let mine = byMe;
      if (!byMe && playerAssistsLeft > 0 && playerOnPitch(minute)) {
        playerAssistsLeft--;
        text += ` (בישול: ${me})`;
        mine = true;
      } else if (Math.random() < 0.55) {
        const assister = pickOne(mates.filter((n) => n !== scorer));
        text += ` (בישול: ${assister})`;
      }
      add({ minute, kind: 'goal', side: 'team', text, team: 1, opp: 0, mine });
    }
    // A goal for the player that could not be placed while on the pitch still counts.
    base.goals -= playerGoalsLeft;
    base.assists -= playerAssistsLeft;
    for (let i = 0; i < opp; i++) {
      add({ minute: freeMinute(3, Math.min(total - 1, lastBase - 2)), kind: 'goal', side: 'opp', text: fill(freshLine('fb.goalOpp', FB.goalOpp), { ...vars, שם: pickOne(oppAttackers) }), team: 0, opp: 1 });
    }
    // Chances, cards, subs, crowd
    for (let i = 0; i < randInt(2, 4); i++) add({ minute: freeMinute(5, 88), kind: 'chance', side: 'team', text: fill(freshLine('fb.chanceTeam', FB.chanceTeam), { ...vars, שם: pickOne(attackers) }), team: 0, opp: 0 });
    for (let i = 0; i < randInt(2, 4); i++) add({ minute: freeMinute(5, 88), kind: 'chance', side: 'opp', text: fill(freshLine('fb.chanceOpp', FB.chanceOpp), { ...vars, שם: pickOne(oppAttackers), שוער: iAmKeeper && playing ? me : teamKeeper }), team: 0, opp: 0 });
    for (let i = 0; i < randInt(1, 4); i++) {
      const ours = Math.random() < 0.5;
      add({ minute: freeMinute(15, 88), kind: 'card', side: ours ? 'team' : 'opp', text: fill(freshLine('fb.card', FB.card), { ...vars, שם: ours ? pickOne(mates) : pickOne(oppAttackers) }), team: 0, opp: 0 });
    }
    if (match.role === 'rotation') {
      add({ minute: rotationIn, kind: 'sub', side: 'team', text: fill(freshLine('fb.sub', FB.sub), { ...vars, שם: me, יוצא: pickOne(mates) }), team: 0, opp: 0, mine: true });
    }
    for (let i = 0; i < randInt(1, 2); i++) add({ minute: freeMinute(60, 85), kind: 'sub', side: Math.random() < 0.5 ? 'team' : 'opp', text: fill(freshLine('fb.sub', FB.sub), { ...vars, שם: pickOne(mates), יוצא: pickOne(mates) }), team: 0, opp: 0 });
    add({ minute: freeMinute(25, 80), kind: 'info', side: 'neutral', text: fill(freshLine('fb.crowd', FB.crowd), vars), team: 0, opp: 0 });
    // Flavor that changes from match to match: who controls the game, derby noise, stoppages, offsides.
    const flowTeam = ts >= match.opponentStrength ? Math.random() < 0.75 : Math.random() < 0.3;
    add({ minute: freeMinute(10, 75), kind: 'info', side: flowTeam ? 'team' : 'opp', text: fill(freshLine(flowTeam ? 'fb.flowTeam' : 'fb.flowOpp', flowTeam ? FB.flowTeam : FB.flowOpp), vars), team: 0, opp: 0 });
    if (match.info?.derby) add({ minute: freeMinute(2, 20), kind: 'info', side: 'neutral', text: fill(freshLine('fb.derby', FB.derby), vars), team: 0, opp: 0 });
    if (Math.random() < 0.35) add({ minute: freeMinute(10, 85), kind: 'info', side: 'neutral', text: fill(freshLine('fb.injury', FB.injury), { ...vars, שם: pickOne(Math.random() < 0.5 ? mates : oppAttackers) }), team: 0, opp: 0 });
    if (Math.random() < 0.3) add({ minute: freeMinute(10, 85), kind: 'info', side: 'neutral', text: fill(freshLine('fb.offside', FB.offside), { ...vars, שם: pickOne(oppAttackers) }), team: 0, opp: 0 });
    add({ minute: 45.5, kind: 'period', side: 'neutral', text: fill(freshLine('fb.halftime', FB.halftime), vars), team: 0, opp: 0 });
    add({ minute: 46, kind: 'info', side: 'neutral', text: fill(freshLine('fb.secondHalf', FB.secondHalf), vars), team: 0, opp: 0 });
    add({ minute: 89.6, kind: 'info', side: 'neutral', text: fill(freshLine('fb.stoppage', FB.stoppage), { תוספת: stoppage }), team: 0, opp: 0 });
    timeline.sort((a, b) => a.minute - b.minute);
    const possession = clamp(Math.round(50 + (ts - match.opponentStrength) * 0.6 + randInt(-5, 5)), 28, 72);
    return {
      ...match,
      timeline,
      totalMinutes: total,
      base,
      decisionMinutes,
      extra: { possession, shotsTeam: team * 2 + randInt(3, 9), shotsOpp: opp * 2 + randInt(3, 9) },
    };
  }

  // Basketball: hidden scoring buckets per minute plus highlight lines
  add({ minute: 0, kind: 'info', side: 'neutral', text: fill(freshLine('bb.kickoff', BB.kickoff), vars), team: 0, opp: 0 });
  const hallLine = (BB as Record<string, string[]>)[match.info?.weather ?? ''];
  if (hallLine) add({ minute: 2.5, kind: 'info', side: 'neutral', text: fill(freshLine(`bb.${match.info?.weather}`, hallLine), vars), team: 0, opp: 0 });
  const distribute = (total: number) => {
    const weights = Array.from({ length: 40 }, () => 0.5 + Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map((w) => (w / sum) * total);
    const pts = raw.map(Math.floor);
    let left = total - pts.reduce((a, b) => a + b, 0);
    raw
      .map((r, i) => ({ i, frac: r - Math.floor(r) }))
      .sort((a, b) => b.frac - a.frac)
      .forEach(({ i }) => {
        if (left > 0) {
          pts[i]++;
          left--;
        }
      });
    return pts;
  };
  const tPts = distribute(team);
  const oPts = distribute(opp);
  for (let m = 0; m < 40; m++) {
    timeline.push({ minute: m + 0.5, kind: 'score', side: 'neutral', text: '', team: tPts[m], opp: oPts[m], hidden: true, base: true });
  }
  const highlights = randInt(7, 11);
  for (let i = 0; i < highlights; i++) {
    const minute = freeMinute(1, 39.5);
    const ours = Math.random() < 0.55;
    const r = Math.random();
    const key = r < 0.3 ? 'three' : r < 0.5 ? 'two' : r < 0.63 ? 'dunk' : r < 0.77 ? 'steal' : r < 0.89 ? 'run' : 'timeout';
    const name = ours ? (playerOnPitch(minute) && Math.random() < 0.3 ? me : pickOne(attackers)) : pickOne(oppAttackers);
    const lines = (BB as Record<string, string[]>)[`${key}${ours ? 'Team' : 'Opp'}`];
    add({
      minute,
      kind: key === 'run' ? 'run' : 'highlight',
      side: ours ? 'team' : 'opp',
      text: fill(freshLine(`bb.${key}${ours ? 'Team' : 'Opp'}`, lines), { ...vars, שם: name, ריצה: `${randInt(7, 12)}:${randInt(0, 2)}` }),
      team: 0,
      opp: 0,
      mine: name === me,
    });
  }
  if (Math.random() < 0.5) add({ minute: freeMinute(5, 35), kind: 'card', side: 'opp', text: fill(freshLine('bb.foul', BB.foul), { שם: pickOne(oppAttackers) }), team: 0, opp: 0 });
  if (match.role === 'rotation') add({ minute: rotationIn, kind: 'sub', side: 'team', text: `${me} נכנס מהספסל`, team: 0, opp: 0, mine: true });
  add({ minute: freeMinute(10, 35), kind: 'info', side: 'neutral', text: fill(freshLine('bb.crowd', BB.crowd), vars), team: 0, opp: 0 });
  if (Math.random() < 0.5) add({ minute: freeMinute(25, 38), kind: 'info', side: 'neutral', text: fill(freshLine('bb.crowd', BB.crowd), vars), team: 0, opp: 0 });
  for (const q of [1, 2, 3]) add({ minute: q * 10 + 0.01, kind: 'period', side: 'neutral', text: q === 2 ? fill(freshLine('bb.halftime', BB.halftime), vars) : fill(freshLine('bb.quarter', BB.quarter), { רבע: QUARTER_NAMES[q] }), team: 0, opp: 0 });
  timeline.sort((a, b) => a.minute - b.minute);
  return { ...match, timeline, totalMinutes: 40, base, decisionMinutes, extra: null };
}

// ------------------------------------------------------------------
// During the match
// ------------------------------------------------------------------

/** Makes the score close enough for a clutch moment; returns null if it is too lopsided. */
export function prepareClutch(match: MatchState, minute: number, sport: SportType, teamName: string, oppRoster: RosterPlayer[], teamRoster: RosterPlayer[]): MatchState | null {
  // Base scoring after the clutch moment never happens.
  const timeline = match.timeline.filter((e) => !(e.base && e.minute > minute && (e.team || e.opp)));
  const { team, opp } = scoreAt(timeline, minute);
  const diff = team - opp;
  const vars = { קבוצה: teamName, יריבה: match.opponent };
  if (sport === 'football') {
    if (Math.abs(diff) > 1) return null;
    if (diff === 1) timeline.push({ minute: minute - 2, kind: 'goal', side: 'opp', text: fill(freshLine('fb.equalizerOpp', FB.equalizerOpp), { ...vars, שם: pickOne(oppRoster).name }), team: 0, opp: 1, base: true });
    if (diff === -1) timeline.push({ minute: minute - 2, kind: 'goal', side: 'team', text: fill(freshLine('fb.equalizerTeam', FB.equalizerTeam), { ...vars, שם: pickOne(teamRoster).name }), team: 1, opp: 0, base: true });
  } else {
    if (Math.abs(diff + 1) > 9) return null;
    const need = opp + 1 - team; // positive: team needs points, negative: opponent needs points
    if (need > 0) timeline.push({ minute: minute - 0.4, kind: 'run', side: 'team', text: `${teamName} חוזרת עם ריצת ${need}:0, פיגור של נקודה`, team: need, opp: 0, base: true });
    if (need < 0) timeline.push({ minute: minute - 0.4, kind: 'run', side: 'opp', text: `${match.opponent} עם ריצת ${-need}:0 ועוברת ליתרון נקודה`, team: 0, opp: -need, base: true });
  }
  timeline.sort((a, b) => a.minute - b.minute);
  return { ...match, timeline };
}

/** Timeline entries for a resolved decision. */
export function decisionEntries(
  minute: number,
  event: GameEvent,
  effects: Effects,
  success: boolean,
  outcomeText: string,
  sport: SportType,
  playerName: string,
  teamRoster: RosterPlayer[],
  oppRoster: RosterPlayer[],
  oppName: string,
): TimelineEntry[] {
  const me = playerName;
  const out: TimelineEntry[] = [];
  const mate = pickOne(teamRoster).name;
  const rival = pickOne(oppRoster.filter((p) => p.pos !== 'שוער')).name;
  const v = { שם: me, מבשל: me, יריבה: oppName };
  if (sport === 'football') {
    if (effects.playerGoals) out.push({ minute, kind: 'goal', side: 'team', text: fill(freshLine('fb.myGoal', FB.myGoal), v), team: effects.playerGoals, opp: 0, mine: true });
    if (effects.teamScore) {
      const text = effects.playerAssists ? fill(freshLine('fb.mateGoalAssist', FB.mateGoalAssist), { ...v, שם: mate }) : fill(freshLine('fb.mateGoal', FB.mateGoal), { ...v, שם: mate });
      out.push({ minute: minute + 0.01, kind: 'goal', side: 'team', text, team: effects.teamScore, opp: 0, mine: Boolean(effects.playerAssists) });
    }
    if (effects.oppScore) out.push({ minute: minute + 0.02, kind: 'goal', side: 'opp', text: fill(freshLine('fb.oppPunish', FB.oppPunish), { ...v, שם: rival }), team: 0, opp: effects.oppScore });
  } else {
    if (effects.playerPoints) out.push({ minute, kind: 'score', side: 'team', text: fill(freshLine('bb.myScore', BB.myScore), { ...v, נקודות: effects.playerPoints }), team: effects.playerPoints, opp: 0, mine: true });
    if (effects.teamScore) {
      const lines = effects.playerAssists ? BB.mateScoreAssist : BB.mateScore;
      const text = fill(freshLine(effects.playerAssists ? 'bb.mateScoreAssist' : 'bb.mateScore', lines), { ...v, שם: mate, נקודות: effects.teamScore });
      out.push({ minute: minute + 0.01, kind: 'score', side: 'team', text, team: effects.teamScore, opp: 0, mine: Boolean(effects.playerAssists) });
    }
    if (effects.oppScore) out.push({ minute: minute + 0.02, kind: 'score', side: 'opp', text: fill(freshLine('bb.oppPunish', BB.oppPunish), { ...v, שם: rival, נקודות: effects.oppScore }), team: 0, opp: effects.oppScore });
  }
  out.unshift({ minute: minute - 0.01, kind: 'moment', side: 'team', text: `${event.title}: ${success ? 'הצלחה' : 'לא הצליח'}. ${outcomeText}`, team: 0, opp: 0, mine: true });
  return out;
}

/** Basketball games cannot end level: adds a 5 minute overtime. Returns null when not needed. */
export function overtimeIfTied(match: MatchState, sport: SportType, teamName: string): MatchState | null {
  if (sport !== 'basketball') return null;
  const { team, opp } = scoreAt(match.timeline, match.totalMinutes);
  if (team !== opp) return null;
  const start = match.totalMinutes;
  const timeline = [...match.timeline, { minute: start + 0.01, kind: 'period' as const, side: 'neutral' as const, text: freshLine('bb.overtime', BB.overtime), team: 0, opp: 0 }];
  let t = 0;
  let o = 0;
  for (let m = 0; m < 5; m++) {
    const tp = randInt(0, 4);
    const op = randInt(0, 4);
    t += tp;
    o += op;
    timeline.push({ minute: start + m + 0.5, kind: 'score', side: 'neutral', text: '', team: tp, opp: op, hidden: true });
  }
  if (t === o) timeline.push({ minute: start + 4.9, kind: 'score', side: 'team', text: `${teamName} מכריעה בשניות האחרונות של ההארכה`, team: Math.random() < 0.5 ? 1 : 0, opp: 0 });
  const after = scoreAt(timeline, start + 5);
  if (after.team === after.opp) timeline.push({ minute: start + 4.95, kind: 'score', side: 'opp', text: `${match.opponent} קולעת זריקת עונשין אחרונה`, team: 0, opp: 1 });
  return { ...match, timeline, totalMinutes: start + 5 };
}

// ------------------------------------------------------------------
// Full time
// ------------------------------------------------------------------

export interface FinalizedMatch {
  match: MatchState;
  result: MatchResult;
  teamScore: number;
  oppScore: number;
}

export function finalizeFromTimeline(match: MatchState, player: Player): FinalizedMatch {
  const sport = player.sport;
  const playing = match.role === 'starter' || match.role === 'rotation';
  const { team, opp } = scoreAt(match.timeline, Infinity);
  const overtime = sport === 'basketball' && match.totalMinutes > 40;
  const outcome: MatchResult['outcome'] = team > opp ? 'win' : team < opp ? 'loss' : 'draw';
  const b = match.base;

  let rating: number | null = null;
  if (playing) {
    let r = 5.9 + match.ratingDelta * 0.6 + randFloat(-0.4, 0.4);
    r += outcome === 'win' ? 0.4 : outcome === 'loss' ? -0.3 : 0;
    r += sport === 'football' ? b.goals * 0.8 + b.assists * 0.5 : (b.points - 8) * 0.05 + b.rebounds * 0.03 + b.assists * 0.05;
    // Keepers and defenders are judged by the goals against
    if (sport === 'football' && player.position === 'GK') r += opp === 0 ? 1.0 : opp === 1 ? 0.6 : 0.45 - (opp - 2) * 0.15;
    else if (sport === 'football' && ['CB', 'LB', 'RB', 'CDM'].includes(player.position)) r += opp === 0 ? 0.3 : 0;
    if (match.role === 'rotation') r -= 0.2;
    rating = Math.round(clamp(r, 3, 10) * 10) / 10;
  }
  const result: MatchResult = { teamScore: team, oppScore: opp, outcome, rating, overtime, motm: rating !== null && rating >= 8 };
  return {
    match: {
      ...match,
      clock: match.totalMinutes,
      playerGoals: b.goals + match.playerGoals,
      playerAssists: b.assists + match.playerAssists,
      playerPoints: b.points + match.playerPoints,
      playerRebounds: b.rebounds + match.playerRebounds,
      result,
    },
    result,
    teamScore: team,
    oppScore: opp,
  };
}
