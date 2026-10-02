import type { Attributes, Effects, Player, SeasonStats, SportType } from '../types/game';
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
  return next;
}

/** Training gain that slows down as the attribute approaches the player's potential. */
export function trainingGain(current: number, potential: number, base: number): number {
  const room = potential - current;
  if (room <= 0) return Math.random() < 0.15 ? 1 : 0;
  const factor = clamp(room / 40, 0.2, 1);
  const raw = base * factor;
  const whole = Math.floor(raw);
  return whole + (Math.random() < raw - whole ? 1 : 0);
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
