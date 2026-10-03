// Season goals set by the coach, career achievements and the career summary.

import type { GameState, Player, SeasonGoal } from '../types/game';
import { topDivision } from '../data/sports';
import { CUP_ROUNDS } from '../data/cup';
import { averageRating, calcOvr } from './playerUtils';
import { playerClubPosition } from './leagueEngine';

// ------------------------------------------------------------------
// Season goals
// ------------------------------------------------------------------

/** What the player has to deliver personally, by position. */
function personalGoal(player: Player): SeasonGoal {
  const p = player.position;
  if (player.sport === 'football') {
    if (p === 'ST') return { kind: 'goals', target: 5, label: 'להבקיע 5 שערים בליגה' };
    if (p === 'LW' || p === 'RW' || p === 'CAM') return { kind: 'goals', target: 3, label: 'להבקיע 3 שערים בליגה' };
    if (p === 'CM' || p === 'LWB' || p === 'RWB' || p === 'LB' || p === 'RB') return { kind: 'assists', target: 3, label: 'לבשל 3 שערים בליגה' };
    return { kind: 'rating', target: 6.8, label: 'ממוצע ציון 6.8 ומעלה (לפחות 4 משחקים)' };
  }
  if (p === 'PG') return { kind: 'assists', target: 40, label: 'לחלק 40 אסיסטים בליגה' };
  if (p === 'PF' || p === 'C') return { kind: 'rebounds', target: 70, label: 'לקחת 70 ריבאונדים בליגה' };
  return { kind: 'points', target: 110, label: 'לקלוע 110 נקודות בליגה' };
}

/** What the club expects, by its strength compared with the rest of the league. */
function teamGoal(state: Pick<GameState, 'player' | 'league'>): SeasonGoal {
  const teams = state.league.teams;
  const n = teams.length;
  const rank = [...teams].sort((a, b) => b.strength - a.strength).findIndex((t) => t.isPlayerClub) + 1;
  const top = state.player.division >= topDivision(state.player.sport);
  if (rank <= 3) return top ? { kind: 'position', target: 3, label: 'לסיים בשלישייה הראשונה' } : { kind: 'position', target: 2, label: 'לעלות ליגה (מקום 1-2)' };
  if (rank <= Math.ceil(n / 2)) return { kind: 'position', target: Math.ceil(n / 2), label: `לסיים בחצי העליון (מקום ${Math.ceil(n / 2)} ומעלה)` };
  return { kind: 'position', target: n - 2, label: 'לא לרדת ליגה' };
}

/** Two or three goals the coach sets at the start of a season. */
export function seasonGoalsFor(state: Pick<GameState, 'player' | 'league' | 'season'>): SeasonGoal[] {
  const extra: SeasonGoal =
    state.season % 2 === 0
      ? { kind: 'cup', target: 2, label: `להגיע ל${CUP_ROUNDS[2].name} בגביע` }
      : { kind: 'apps', target: 9, label: 'לשחק לפחות 9 משחקי ליגה' };
  return [personalGoal(state.player), teamGoal(state), extra];
}

export function goalsOf(state: GameState): SeasonGoal[] {
  return state.goals && state.goals.season === state.season ? state.goals.items : seasonGoalsFor(state);
}

export interface GoalStatus {
  goal: SeasonGoal;
  current: number;
  done: boolean;
  /** Progress towards the target, 0..1 (for the bar). */
  share: number;
}

export function goalStatus(state: GameState, goal: SeasonGoal, finalPosition?: number): GoalStatus {
  const s = state.player.seasonStats;
  const cupWins = state.cup && state.cup.season === state.season ? state.cup.results.filter((r) => r.advanced).length : 0;
  let current = 0;
  let done = false;
  let share = 0;
  switch (goal.kind) {
    case 'goals':
    case 'assists':
    case 'points':
    case 'rebounds':
    case 'apps':
      current = s[goal.kind];
      done = current >= goal.target;
      share = current / goal.target;
      break;
    case 'rating':
      current = Math.round(averageRating(s) * 100) / 100;
      done = s.apps >= 4 && current >= goal.target;
      share = s.apps >= 4 ? current / goal.target : s.apps / 4 / 2;
      break;
    case 'position':
      current = finalPosition ?? (state.matchday > 0 ? playerClubPosition(state.league) : 0);
      done = current > 0 && current <= goal.target;
      share = current === 0 ? 0 : done ? 1 : goal.target / current;
      break;
    case 'cup':
      current = cupWins;
      done = current >= goal.target;
      share = current / goal.target;
      break;
  }
  return { goal, current, done, share: Math.max(0, Math.min(1, share)) };
}

// ------------------------------------------------------------------
// Achievements
// ------------------------------------------------------------------

export interface Achievement {
  id: string;
  title: string;
  description: string;
  test: (state: GameState) => boolean;
}

const fb = (s: GameState) => s.player.sport === 'football';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'debut', title: 'הופעת בכורה', description: 'משחק ראשון בקריירה', test: (s) => s.player.careerStats.apps >= 1 },
  { id: 'first_score', title: 'הראשון שלי', description: 'שער ראשון או 50 נקודות ראשונות', test: (s) => (fb(s) ? s.player.careerStats.goals >= 1 : s.player.careerStats.points >= 50) },
  { id: 'scorer', title: 'קלעי', description: '25 שערים או 500 נקודות בקריירה', test: (s) => (fb(s) ? s.player.careerStats.goals >= 25 : s.player.careerStats.points >= 500) },
  { id: 'legend_scorer', title: 'מלך השערים', description: '100 שערים או 2,000 נקודות בקריירה', test: (s) => (fb(s) ? s.player.careerStats.goals >= 100 : s.player.careerStats.points >= 2000) },
  { id: 'apps_50', title: '50 הופעות', description: '50 משחקים בקריירה', test: (s) => s.player.careerStats.apps >= 50 },
  { id: 'apps_150', title: 'ברזל', description: '150 משחקים בקריירה', test: (s) => s.player.careerStats.apps >= 150 },
  { id: 'motm_10', title: 'שחקן המשחק', description: '10 פעמים שחקן המשחק', test: (s) => s.player.careerStats.motm >= 10 },
  { id: 'promoted', title: 'עולים ליגה', description: 'עלייה ראשונה של ליגה', test: (s) => s.player.history.some((h) => h.division < s.player.division) },
  { id: 'top_league', title: 'הליגה הבכירה', description: 'משחק בליגה הבכירה', test: (s) => s.player.division >= topDivision(s.player.sport) },
  { id: 'champion', title: 'אלוף', description: 'אליפות ליגה', test: (s) => (s.flags.titles ?? 0) >= 1 },
  { id: 'cup_winner', title: 'מחזיק הגביע', description: 'זכייה בגביע המדינה', test: (s) => (s.flags.cupWins ?? 0) >= 1 },
  { id: 'u21', title: 'הנבחרת הצעירה', description: 'הופעה בנבחרת עד גיל 21', test: (s) => s.player.national.u21Caps >= 1 },
  { id: 'national', title: 'נבחרת ישראל', description: 'הופעה בנבחרת הבוגרת', test: (s) => s.player.national.caps >= 1 },
  { id: 'national_10', title: 'שחקן נבחרת', description: '10 הופעות בנבחרת הבוגרת', test: (s) => s.player.national.caps >= 10 },
  { id: 'captain', title: 'קפטן', description: 'נבחרת לקפטן הקבוצה', test: (s) => s.player.isCaptain || Boolean(s.flags.wasCaptain) },
  { id: 'pro', title: 'מקצוען', description: 'חוזה מקצועני', test: (s) => s.player.contract === 'pro' },
  { id: 'sponsor', title: 'הפנים של המותג', description: 'חוזה חסות ראשון', test: (s) => s.player.sponsors.length >= 1 },
  { id: 'followers_10k', title: '10 אלף עוקבים', description: '10,000 עוקבים ברשתות', test: (s) => s.player.followers >= 10000 },
  { id: 'followers_100k', title: 'כוכב רשת', description: '100,000 עוקבים ברשתות', test: (s) => s.player.followers >= 100000 },
  { id: 'ovr_70', title: 'שחקן איכות', description: 'דירוג כללי 70', test: (s) => calcOvr(s.player) >= 70 },
  { id: 'ovr_80', title: 'כוכב', description: 'דירוג כללי 80', test: (s) => calcOvr(s.player) >= 80 },
  { id: 'loyal_friend', title: 'חבר אמיתי', description: 'היית שם כשהחבר נפצע', test: (s) => (s.player.memories ?? []).includes('friend_loyal') },
  { id: 'parents_house', title: 'הבטחה לאמא', description: 'קנית בית להורים', test: (s) => (s.shop?.owned ?? []).includes('parents_house') },
  { id: 'decade', title: 'עשור על המגרש', description: '10 עונות בקריירה', test: (s) => s.player.history.length >= 10 },
];

/** Achievements reached now that were not unlocked before. */
export function newAchievements(state: GameState): Achievement[] {
  const have = new Set((state.flags.achievements ?? []).map((a) => a.id));
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(state));
}

// ------------------------------------------------------------------
// Retirement
// ------------------------------------------------------------------

/** From this age the player can hang up the boots; at the last age the body decides. */
export const RETIRE_FROM_AGE = 32;
export const LAST_SEASON_AGE = 37;
