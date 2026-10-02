import type { Effects, MatchResult, MatchRole, MatchState, Player, Position } from '../types/game';
import { calcOvr, clamp, randFloat, randInt } from './playerUtils';
import { simulateScore } from './leagueEngine';

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

export function createMatchState(opponent: string, opponentStrength: number, home: boolean, role: MatchRole): MatchState {
  return {
    opponent,
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
    teamScoreDelta: 0,
    oppScoreDelta: 0,
    clutchTeamDelta: 0,
    clutchOppDelta: 0,
    ratingDelta: 0,
    pendingOutcome: null,
    result: null,
  };
}

/** Applies the match-related part of an effects object to the running match. */
export function applyMatchEffects(match: MatchState, effects: Effects, clutch: boolean): MatchState {
  const next = { ...match };
  const teamGain = (effects.playerGoals ?? 0) + (effects.playerPoints ?? 0) + (effects.teamScore ?? 0);
  const oppGain = effects.oppScore ?? 0;
  if (clutch) {
    next.clutchTeamDelta += teamGain;
    next.clutchOppDelta += oppGain;
  } else {
    next.teamScoreDelta += teamGain;
    next.oppScoreDelta += oppGain;
  }
  next.playerGoals += effects.playerGoals ?? 0;
  next.playerPoints += effects.playerPoints ?? 0;
  next.playerAssists += effects.playerAssists ?? 0;
  next.playerRebounds += effects.playerRebounds ?? 0;
  next.ratingDelta += effects.rating ?? 0;
  return next;
}

const FOOTBALL_GOAL_FACTOR: Partial<Record<Position, number>> = { striker: 1, midfielder: 0.55, fullBack: 0.2, centerBack: 0.15 };
const FOOTBALL_ASSIST_FACTOR: Partial<Record<Position, number>> = { striker: 0.5, midfielder: 1, fullBack: 0.6, centerBack: 0.15 };
const BB_POINTS_FACTOR: Partial<Record<Position, number>> = { PG: 0.9, SG: 1.1, SF: 1, PF: 0.85, C: 0.8 };
const BB_REB_FACTOR: Partial<Record<Position, number>> = { PG: 0.4, SG: 0.5, SF: 0.8, PF: 1.2, C: 1.5 };
const BB_AST_FACTOR: Partial<Record<Position, number>> = { PG: 1.4, SG: 0.7, SF: 0.6, PF: 0.4, C: 0.35 };

export interface FinalizedMatch {
  match: MatchState;
  result: MatchResult;
  /** Scores from the player's club point of view. */
  teamScore: number;
  oppScore: number;
}

/** Simulates the rest of the match around the decisions the player made. */
export function finalizeMatch(match: MatchState, player: Player, clubStrength: number): FinalizedMatch {
  const sport = player.sport;
  const playing = match.role === 'starter' || match.role === 'rotation';
  const ts = teamStrength(clubStrength, player, match.role);
  const sim = match.home
    ? simulateScore(sport, player.division, ts, match.opponentStrength)
    : simulateScore(sport, player.division, match.opponentStrength, ts);
  let team = match.home ? sim.home : sim.away;
  let opp = match.home ? sim.away : sim.home;
  let overtime = sim.overtime;

  // Baseline individual contribution (outside of the decision scenarios)
  let baseGoals = 0;
  let baseAssists = 0;
  let basePoints = 0;
  let baseRebounds = 0;
  let baseAssistsBb = 0;
  if (playing) {
    const minutes = match.role === 'starter' ? 1 : 0.5;
    if (sport === 'football') {
      const goalP = (FOOTBALL_GOAL_FACTOR[player.position] ?? 0.3) * (player.attributes.attack / 100) * 0.3 * minutes;
      baseGoals = Math.random() < goalP ? 1 : 0;
      team = Math.max(team, baseGoals);
      const assistP = (FOOTBALL_ASSIST_FACTOR[player.position] ?? 0.3) * (player.attributes.playmaking / 100) * 0.35 * minutes;
      baseAssists = team - baseGoals > 0 && Math.random() < assistP ? 1 : 0;
    } else {
      const mf = match.role === 'starter' ? 1 : 0.55;
      basePoints = Math.max(0, Math.round((3 + player.attributes.attack * 0.14 * (BB_POINTS_FACTOR[player.position] ?? 1)) * mf + randInt(-3, 3)));
      baseRebounds = Math.max(0, Math.round((1 + player.attributes.physical * 0.06 * (BB_REB_FACTOR[player.position] ?? 1)) * mf + randInt(-1, 2)));
      baseAssistsBb = Math.max(0, Math.round((0.5 + player.attributes.playmaking * 0.05 * (BB_AST_FACTOR[player.position] ?? 1)) * mf + randInt(-1, 1)));
      team = Math.max(team, basePoints + 20);
    }
  }

  // Decisions made during the match
  team += match.teamScoreDelta;
  opp = Math.max(0, opp + match.oppScoreDelta);

  if (match.clutch) {
    if (sport === 'football') {
      const level = Math.max(team, opp);
      team = level;
      opp = level;
    } else {
      opp = team + 1;
    }
    team += match.clutchTeamDelta;
    opp += match.clutchOppDelta;
  }

  if (sport === 'basketball') {
    while (team === opp) {
      overtime = true;
      team += randInt(4, 12);
      opp += randInt(4, 12);
    }
  }

  const outcome: MatchResult['outcome'] = team > opp ? 'win' : team < opp ? 'loss' : 'draw';

  const totalGoals = baseGoals + match.playerGoals;
  const totalAssists = (sport === 'football' ? baseAssists : baseAssistsBb) + match.playerAssists;
  const totalPoints = basePoints + match.playerPoints;
  const totalRebounds = baseRebounds + match.playerRebounds;

  let rating: number | null = null;
  if (playing) {
    let r = 5.9 + match.ratingDelta * 0.6 + randFloat(-0.4, 0.4);
    r += outcome === 'win' ? 0.4 : outcome === 'loss' ? -0.3 : 0;
    if (sport === 'football') {
      r += baseGoals * 0.8 + baseAssists * 0.5;
    } else {
      r += (basePoints - 8) * 0.05 + baseRebounds * 0.03 + baseAssistsBb * 0.05;
    }
    if (match.role === 'rotation') r -= 0.2;
    rating = Math.round(clamp(r, 3, 10) * 10) / 10;
  }

  const result: MatchResult = {
    teamScore: team,
    oppScore: opp,
    outcome,
    rating,
    overtime,
    motm: rating !== null && rating >= 8,
  };

  return {
    match: {
      ...match,
      playerGoals: totalGoals,
      playerAssists: totalAssists,
      playerPoints: totalPoints,
      playerRebounds: totalRebounds,
      result,
    },
    result,
    teamScore: team,
    oppScore: opp,
  };
}
