import type { AttrKey, Attributes, Effects, Player, SeasonStats, SportType } from '../types/game';
import { ATTR_KEYS, ATTR_LABEL, OVR_WEIGHTS } from '../data/sports';

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const randFloat = (min: number, max: number) => Math.random() * (max - min) + min;

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function emptyStats(): SeasonStats {
  return { apps: 0, starts: 0, goals: 0, assists: 0, points: 0, rebounds: 0, ratingSum: 0, wins: 0, draws: 0, losses: 0, motm: 0 };
}

export function addStats(a: SeasonStats, b: SeasonStats): SeasonStats {
  const out = emptyStats();
  (Object.keys(out) as Array<keyof SeasonStats>).forEach((k) => {
    out[k] = a[k] + b[k];
  });
  return out;
}

export function averageRating(stats: SeasonStats): number {
  return stats.apps > 0 ? stats.ratingSum / stats.apps : 0;
}

/** Average rating of the last five matches played, or null before there are enough. */
export function recentForm(player: Pick<Player, 'form'>, min = 3): number | null {
  const last = (player.form ?? []).slice(-5);
  if (last.length < min) return null;
  return last.reduce((sum, r) => sum + r, 0) / last.length;
}

export function calcOvr(player: Pick<Player, 'attributes' | 'position'>): number {
  const weights = OVR_WEIGHTS[player.position];
  const total = ATTR_KEYS.reduce((sum, key) => sum + player.attributes[key] * weights[key], 0);
  return Math.round(total);
}

export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}₪${Math.abs(Math.round(value)).toLocaleString('he-IL')}`;
}

export function formatFollowers(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

/** Applies the non-match part of an effects object to the player. */
export function applyPlayerEffects(player: Player, effects: Effects): Player {
  const next: Player = { ...player, attributes: { ...player.attributes } };
  if (effects.budget) next.budget = Math.round(next.budget + effects.budget);
  if (effects.energy) next.energy = clamp(next.energy + effects.energy, 0, 100);
  if (effects.coachApproval) next.coachApproval = clamp(next.coachApproval + effects.coachApproval, 0, 100);
  if (effects.fanRep) next.fanRep = clamp(next.fanRep + effects.fanRep, 0, 100);
  if (effects.teamMorale) next.teamMorale = clamp(next.teamMorale + effects.teamMorale, 0, 100);
  if (effects.confidence) next.confidence = clamp(next.confidence + effects.confidence, 0, 100);
  if (effects.followers) next.followers = Math.max(0, next.followers + effects.followers);
  if (effects.injuryWeeks) next.injuryWeeks = Math.max(next.injuryWeeks, effects.injuryWeeks);
  if (effects.attributes) {
    for (const key of ATTR_KEYS) {
      const delta = effects.attributes[key];
      if (delta) next.attributes[key] = clamp(next.attributes[key] + delta, 1, 99);
    }
  }
  if (effects.setAgent !== undefined) next.agentId = effects.setAgent;
  if (effects.setCaptain !== undefined) next.isCaptain = effects.setCaptain;
  return next;
}

/**
 * How far the player's name carries. Nobody follows a 19-year-old in the
 * bottom tier; fame grows with the league, the level and the national team.
 */
export function fameFactor(player: Pick<Player, 'division' | 'attributes' | 'position' | 'national' | 'fanRep'>): number {
  const ovr = calcOvr(player);
  const caps = player.national.caps + player.national.u21Caps;
  return clamp(0.3 + player.division * 0.25 + Math.max(0, ovr - 50) * 0.02 + (caps > 0 ? 0.3 : 0), 0.3, 2);
}

/** Scales positive followers / fan reputation gains by the player's fame. */
export function scaleFame(effects: Effects, player: Parameters<typeof fameFactor>[0]): Effects {
  if (!(effects.followers && effects.followers > 0) && !(effects.fanRep && effects.fanRep > 0)) return effects;
  const fame = fameFactor(player);
  const out = { ...effects };
  if (out.followers && out.followers > 0) out.followers = Math.max(1, Math.round(out.followers * fame));
  if (out.fanRep && out.fanRep > 0) {
    // Winning hearts gets harder the more the fans already love you.
    const saturation = Math.max(0.25, 1 - player.fanRep / 120);
    out.fanRep = Math.max(1, Math.round(out.fanRep * clamp(0.45 + fame * 0.4, 0.55, 1.2) * saturation));
  }
  return out;
}

/**
 * Fraction of an attribute point one session adds. Progress slows as the
 * attribute nears the player's potential, with age, and when training tired.
 */
export function trainingProgress(player: Pick<Player, 'attributes' | 'potential' | 'age' | 'energy'>, key: AttrKey, base: number): number {
  const room = player.potential - player.attributes[key];
  const roomFactor = room <= 0 ? 0.05 : clamp(room / 30, 0.12, 1);
  const ageFactor = player.age <= 21 ? 1.1 : player.age <= 24 ? 1 : player.age <= 28 ? 0.8 : player.age <= 31 ? 0.55 : 0.35;
  const fatigue = player.energy < 40 ? 0.7 : 1;
  return base * roomFactor * ageFactor * fatigue * randFloat(0.8, 1.2);
}

/** Adds fractional progress; every full point raises the attribute by one. */
export function addProgress(player: Player, gains: Partial<Attributes>): { player: Player; raised: AttrKey[] } {
  const attributes = { ...player.attributes };
  const progress = { ...player.progress };
  const raised: AttrKey[] = [];
  for (const key of ATTR_KEYS) {
    const gain = gains[key];
    if (!gain) continue;
    progress[key] += gain;
    while (progress[key] >= 1 && attributes[key] < 99) {
      progress[key] -= 1;
      attributes[key] += 1;
      raised.push(key);
    }
    progress[key] = clamp(progress[key], 0, 0.999);
  }
  return { player: { ...player, attributes, progress }, raised };
}

export function addAttributes(attrs: Attributes, delta: Partial<Attributes>): Attributes {
  const next = { ...attrs };
  for (const key of ATTR_KEYS) {
    if (delta[key]) next[key] = clamp(next[key] + (delta[key] ?? 0), 1, 99);
  }
  return next;
}

/** Human readable list of effect changes, used in outcome boxes. */
export function describeEffects(effects: Effects, sport: SportType): Array<{ label: string; value: string; positive: boolean }> {
  const out: Array<{ label: string; value: string; positive: boolean }> = [];
  const push = (label: string, v: number | undefined, suffix = '', invert = false) => {
    if (!v) return;
    out.push({ label, value: `${v > 0 ? '+' : ''}${v}${suffix}`, positive: invert ? v < 0 : v > 0 });
  };
  push(sport === 'football' ? 'שערים' : 'נקודות', sport === 'football' ? effects.playerGoals : effects.playerPoints);
  push(sport === 'football' ? 'בישולים' : 'אסיסטים', effects.playerAssists);
  push('ריבאונדים', effects.playerRebounds);
  push('לקבוצה', effects.teamScore);
  push('ליריבה', effects.oppScore, '', true);
  if (effects.budget) {
    out.push({ label: 'תקציב', value: `${effects.budget > 0 ? '+' : ''}${formatMoney(effects.budget)}`, positive: effects.budget > 0 });
  }
  push('אנרגיה', effects.energy, '%');
  push('אמון המאמן', effects.coachApproval, '%');
  push('מוניטין אוהדים', effects.fanRep);
  push('מורל קבוצתי', effects.teamMorale);
  push('ביטחון', effects.confidence);
  push('עוקבים', effects.followers);
  if (effects.attributes) {
    for (const key of ATTR_KEYS) push(ATTR_LABEL[sport][key], effects.attributes[key]);
  }
  if (effects.injuryWeeks) out.push({ label: 'פציעה', value: `${effects.injuryWeeks} מחזורים`, positive: false });
  return out;
}
