import type { LeagueState, LeagueTeam, SportType } from '../types/game';
import { poolFor } from '../data/clubs';
import { clubPlace, distanceKm } from '../data/places';
import { DIVISION_STRENGTH, SEASON_MATCHDAYS } from '../data/sports';
import { clamp, randInt, shuffle } from './playerUtils';

const LEAGUE_SIZE = SEASON_MATCHDAYS + 1; // 13 teams => 12 matchdays for the player's club

function gaussian(): number {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
}

function poisson(lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > limit && k < 12);
  return k - 1;
}

/** Simulates a final score between two strengths. Basketball never ends in a tie. */
export function simulateScore(
  sport: SportType,
  division: number,
  homeStrength: number,
  awayStrength: number,
): { home: number; away: number; overtime: boolean } {
  const diff = homeStrength - awayStrength;
  if (sport === 'football') {
    const lh = clamp(1.4 + diff / 22, 0.25, 4);
    const la = clamp(1.1 - diff / 22, 0.2, 4);
    return { home: poisson(lh), away: poisson(la), overtime: false };
  }
  const base = 64 + division * 3;
  let home = Math.round(base + diff * 0.55 + 2.5 + gaussian() * 9);
  let away = Math.round(base - diff * 0.55 + gaussian() * 9);
  let overtime = false;
  while (home === away) {
    overtime = true;
    home += randInt(4, 12);
    away += randInt(4, 12);
  }
  return { home, away, overtime };
}

function emptyTeam(name: string, strength: number, isPlayerClub: boolean): LeagueTeam {
  return { name, strength, played: 0, won: 0, drawn: 0, lost: 0, scored: 0, conceded: 0, points: 0, isPlayerClub };
}

/** Round-robin schedule using the circle method; the player's club sits at index 0. */
function buildSchedule(teamCount: number): { rounds: Array<Array<[number, number]>>; extra: Array<[number, number]> } {
  const n = teamCount % 2 === 0 ? teamCount : teamCount + 1;
  const dummy = teamCount; // only used when teamCount is odd
  const ids = Array.from({ length: n }, (_, i) => i);
  const allRounds: Array<Array<[number, number]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      if (a === dummy || b === dummy) {
        pairs.push([a, b]);
        continue;
      }
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    allRounds.push(pairs);
    // rotate all but the first element
    ids.splice(1, 0, ids.pop()!);
  }
  const byeRoundIndex = allRounds.findIndex((pairs) => pairs.some(([a, b]) => (a === 0 && b === dummy) || (b === 0 && a === dummy)));
  const clean = (pairs: Array<[number, number]>) => pairs.filter(([a, b]) => a !== dummy && b !== dummy);
  const extra = byeRoundIndex >= 0 ? clean(allRounds[byeRoundIndex]) : [];
  const rounds = shuffle(allRounds.filter((_, i) => i !== byeRoundIndex).map(clean));
  return { rounds, extra };
}

/** Divisions that are split by region in Israel (north / south leagues). */
const REGIONAL_UP_TO: Record<SportType, number> = { football: 2, basketball: 1 };

/**
 * The other twelve clubs. Lower leagues are regional, so they are the clubs
 * nearest to the player's club; higher leagues are national and drawn from
 * the whole pool.
 */
function pickOpponents(sport: SportType, division: number, playerClub: string): string[] {
  const pool = poolFor(sport, division).filter((name) => name !== playerClub);
  const home = clubPlace(playerClub);
  if (division > REGIONAL_UP_TO[sport] || !home) return shuffle(pool).slice(0, LEAGUE_SIZE - 1);
  const byDistance = [...pool].sort((a, b) => (clubDistanceFrom(home, a) ?? 999) - (clubDistanceFrom(home, b) ?? 999));
  return byDistance.slice(0, LEAGUE_SIZE - 1);
}

function clubDistanceFrom(home: { lat: number; lon: number }, club: string): number | null {
  const place = clubPlace(club);
  return place ? distanceKm(home, place) : null;
}

export function createLeague(
  sport: SportType,
  division: number,
  playerClub: string,
  playerClubStrength?: number,
  roundsAlreadyPlayed = 0,
): LeagueState {
  const baseStrength = DIVISION_STRENGTH[sport][division];
  const opponents = pickOpponents(sport, division, playerClub);
  const teams: LeagueTeam[] = [
    emptyTeam(playerClub, playerClubStrength ?? baseStrength + randInt(-3, 3), true),
    ...opponents.map((name) => emptyTeam(name, baseStrength + randInt(-7, 7), false)),
  ];
  const { rounds, extra } = buildSchedule(teams.length);
  let league: LeagueState = { division, teams, rounds, extraFixtures: extra };
  // When joining mid-season, fill in the results that were already played.
  for (let md = 0; md < roundsAlreadyPlayed; md++) {
    for (const [h, a] of league.rounds[md]) {
      const score = simulateScore(sport, division, league.teams[h].strength, league.teams[a].strength);
      league = applyResult(league, sport, h, a, score.home, score.away);
    }
  }
  return league;
}

export function applyResult(
  league: LeagueState,
  sport: SportType,
  homeIdx: number,
  awayIdx: number,
  homeScore: number,
  awayScore: number,
): LeagueState {
  const teams = league.teams.map((t) => ({ ...t }));
  const home = teams[homeIdx];
  const away = teams[awayIdx];
  home.played++;
  away.played++;
  home.scored += homeScore;
  home.conceded += awayScore;
  away.scored += awayScore;
  away.conceded += homeScore;
  const winPts = sport === 'football' ? 3 : 2;
  const lossPts = sport === 'football' ? 0 : 1;
  if (homeScore > awayScore) {
    home.won++;
    away.lost++;
    home.points += winPts;
    away.points += lossPts;
  } else if (awayScore > homeScore) {
    away.won++;
    home.lost++;
    away.points += winPts;
    home.points += lossPts;
  } else {
    home.drawn++;
    away.drawn++;
    home.points += 1;
    away.points += 1;
  }
  return { ...league, teams };
}

export function playerClubIndex(league: LeagueState): number {
  return league.teams.findIndex((t) => t.isPlayerClub);
}

export function fixtureFor(league: LeagueState, matchday: number): { opponentIndex: number; home: boolean } {
  const me = playerClubIndex(league);
  const round = league.rounds[matchday] ?? [];
  const pair = round.find(([h, a]) => h === me || a === me);
  if (!pair) {
    // Should not happen, but never crash: pick any other team.
    return { opponentIndex: me === 0 ? 1 : 0, home: true };
  }
  return pair[0] === me ? { opponentIndex: pair[1], home: true } : { opponentIndex: pair[0], home: false };
}

export interface FixtureResult {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

/** Simulates all fixtures of a matchday that do not involve the player's club. */
export function simulateOtherFixtures(
  league: LeagueState,
  sport: SportType,
  matchday: number,
  includeExtra: boolean,
): { league: LeagueState; results: FixtureResult[] } {
  const me = playerClubIndex(league);
  const fixtures = [...(league.rounds[matchday] ?? []), ...(includeExtra ? league.extraFixtures : [])].filter(
    ([h, a]) => h !== me && a !== me,
  );
  let next = league;
  const results: FixtureResult[] = [];
  for (const [h, a] of fixtures) {
    const score = simulateScore(sport, league.division, next.teams[h].strength, next.teams[a].strength);
    next = applyResult(next, sport, h, a, score.home, score.away);
    results.push({ home: next.teams[h].name, away: next.teams[a].name, homeScore: score.home, awayScore: score.away });
  }
  return { league: next, results };
}

export function sortedTable(league: LeagueState): LeagueTeam[] {
  return [...league.teams].sort(
    (a, b) =>
      b.points - a.points ||
      b.scored - b.conceded - (a.scored - a.conceded) ||
      b.scored - a.scored ||
      a.name.localeCompare(b.name, 'he'),
  );
}

export function playerClubPosition(league: LeagueState): number {
  return sortedTable(league).findIndex((t) => t.isPlayerClub) + 1;
}
