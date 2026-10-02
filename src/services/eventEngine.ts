// ===================================================================
// Event engine: JSON loader, placeholder parser and sport-aware filter.
// Built to scale to 1,000+ events: every pool is filtered by sport and
// conditions, weighted, and de-duplicated against recently seen ids.
// ===================================================================

import preMatchJson from '../data/events/preMatchEvents.json';
import inGameJson from '../data/events/inGameEvents.json';
import postMatchJson from '../data/events/postMatchEvents.json';
import lifeJson from '../data/events/lifeEvents.json';

import type {
  EventChoice,
  EventContext,
  EventType,
  GameEvent,
  GameState,
  Player,
  ChoiceOutcome,
  Effects,
} from '../types/game';
import { SPORT_LABEL, SURFACE_LABEL } from '../data/sports';
import { getJob } from '../data/jobs';
import { getAgent } from '../data/agents';
import { NATIONAL_TEAM_NAME } from '../data/national';
import { calcOvr, clamp, shuffle } from './playerUtils';

export const EVENT_POOLS: Record<EventType, GameEvent[]> = {
  preMatch: preMatchJson as GameEvent[],
  inGame: inGameJson as GameEvent[],
  postMatch: postMatchJson as GameEvent[],
  life: lifeJson as GameEvent[],
};

const EVENT_INDEX: Map<string, GameEvent> = new Map(
  Object.values(EVENT_POOLS)
    .flat()
    .map((event) => [event.id, event]),
);

export function getEventById(id: string | null | undefined): GameEvent | null {
  if (!id) return null;
  return EVENT_INDEX.get(id) ?? null;
}

export function getAllEvents(): GameEvent[] {
  return [...EVENT_INDEX.values()];
}

// ------------------------------------------------------------------
// Placeholder parser
// ------------------------------------------------------------------

const PLACEHOLDER_RE = /\{(שחקן|קבוצה|יריבה|עבודה|סוכן|משטח|ספורט)\}/g;

export function parseText(text: string, ctx: EventContext): string {
  return text.replace(PLACEHOLDER_RE, (_match, key: string) => {
    switch (key) {
      case 'שחקן':
        return ctx.playerName;
      case 'קבוצה':
        return ctx.club;
      case 'יריבה':
        return ctx.opponent;
      case 'עבודה':
        return ctx.job;
      case 'סוכן':
        return ctx.agent;
      case 'משטח':
        return SURFACE_LABEL[ctx.sport];
      case 'ספורט':
        return SPORT_LABEL[ctx.sport];
      default:
        return key;
    }
  });
}

export function buildContext(state: Pick<GameState, 'player' | 'currentMatch'>, opponentOverride?: string): EventContext {
  const { player } = state;
  return {
    playerName: player.name,
    club: state.currentMatch?.national ? NATIONAL_TEAM_NAME[state.currentMatch.national] : player.club,
    opponent: opponentOverride ?? state.currentMatch?.opponent ?? 'היריבה',
    job: getJob(player.jobId)?.name ?? 'מובטל',
    agent: getAgent(player.agentId)?.name ?? 'הסוכן',
    sport: player.sport,
  };
}

/** Returns a copy of the event with all text fields parsed. */
export function parseEvent(event: GameEvent, ctx: EventContext): GameEvent {
  const parseOutcome = (o: ChoiceOutcome | undefined): ChoiceOutcome | undefined =>
    o ? { text: parseText(o.text, ctx), effects: parseEffects(o.effects, ctx) } : undefined;
  return {
    ...event,
    speaker: parseText(event.speaker, ctx),
    title: parseText(event.title, ctx),
    text: parseText(event.text, ctx),
    tip: event.tip ? parseText(event.tip, ctx) : undefined,
    choices: event.choices.map((choice) => ({
      ...choice,
      label: parseText(choice.label, ctx),
      success: parseOutcome(choice.success)!,
      fail: parseOutcome(choice.fail),
    })),
  };
}

export function parseEffects(effects: Effects, ctx: EventContext): Effects {
  if (!effects.news) return effects;
  return { ...effects, news: { ...effects.news, text: parseText(effects.news.text, ctx) } };
}

// ------------------------------------------------------------------
// Filtering & selection
// ------------------------------------------------------------------

export interface FilterExtras {
  matchResult?: 'win' | 'draw' | 'loss';
  matchday?: number;
}

export function isEligible(event: GameEvent, player: Player, extras: FilterExtras = {}): boolean {
  if (event.sport !== 'both' && event.sport !== player.sport) return false;
  const c = event.conditions;
  if (!c) return true;
  if (c.minDivision !== undefined && player.division < c.minDivision) return false;
  if (c.maxDivision !== undefined && player.division > c.maxDivision) return false;
  if (c.requiresJob !== undefined && Boolean(player.jobId) !== c.requiresJob) return false;
  if (c.requiresAgent !== undefined && Boolean(player.agentId) !== c.requiresAgent) return false;
  if (c.requiresCaptain !== undefined && Boolean(player.isCaptain) !== c.requiresCaptain) return false;
  if (c.contract && !c.contract.includes(player.contract)) return false;
  if (c.minOvr !== undefined && calcOvr(player) < c.minOvr) return false;
  if (c.positions && !c.positions.includes(player.position)) return false;
  if (c.matchResult && (!extras.matchResult || !c.matchResult.includes(extras.matchResult))) return false;
  if (c.minMatchday !== undefined && (extras.matchday ?? 0) < c.minMatchday) return false;
  return true;
}

export function filterEvents(type: EventType, player: Player, extras: FilterExtras = {}): GameEvent[] {
  return EVENT_POOLS[type].filter((event) => !event.trigger && isEligible(event, player, extras));
}

function weightedPick(events: GameEvent[]): GameEvent | null {
  if (events.length === 0) return null;
  const total = events.reduce((sum, e) => sum + (e.weight ?? 1), 0);
  let roll = Math.random() * total;
  for (const event of events) {
    roll -= event.weight ?? 1;
    if (roll <= 0) return event;
  }
  return events[events.length - 1];
}

/**
 * Picks one random eligible event, preferring events that were not seen recently.
 * Falls back to the full eligible pool if everything was seen.
 */
export function pickEvent(
  type: EventType,
  player: Player,
  seen: string[],
  extras: FilterExtras = {},
  exclude: string[] = [],
): GameEvent | null {
  const eligible = filterEvents(type, player, extras).filter((e) => !exclude.includes(e.id));
  const fresh = eligible.filter((e) => !seen.includes(e.id));
  return weightedPick(fresh.length > 0 ? fresh : eligible);
}

/** Picks the in-game scenarios for one match. A clutch scenario (if any) is always last. */
export function pickInGameEvents(player: Player, seen: string[], count: number): GameEvent[] {
  if (count <= 0) return [];
  const eligible = filterEvents('inGame', player);
  const fresh = eligible.filter((e) => !seen.includes(e.id));
  const pool = shuffle(fresh.length >= count ? fresh : eligible);
  const picked: GameEvent[] = [];
  let hasClutch = false;
  for (const event of pool) {
    if (picked.length >= count) break;
    if (event.clutch) {
      if (hasClutch) continue;
      hasClutch = true;
    }
    picked.push(event);
  }
  return [...picked.filter((e) => !e.clutch), ...picked.filter((e) => e.clutch)];
}

/** Random eligible event among those sharing a trigger (e.g. national team scenes). */
export function pickTriggeredEvent(trigger: string, player: Player, seen: string[]): GameEvent | null {
  const pool = getAllEvents().filter((e) => e.trigger === trigger && isEligible(e, player));
  const fresh = pool.filter((e) => !seen.includes(e.id));
  return weightedPick(fresh.length > 0 ? fresh : pool);
}

export function getTriggeredEvent(trigger: string): GameEvent | null {
  for (const pool of Object.values(EVENT_POOLS)) {
    const found = pool.find((e) => e.trigger === trigger);
    if (found) return found;
  }
  return null;
}

// ------------------------------------------------------------------
// Choice resolution
// ------------------------------------------------------------------

/** Success probability (0-100) of a skill-check choice. */
export function successChance(choice: EventChoice, player: Player): number {
  if (!choice.stat || choice.difficulty === undefined) return 100;
  const statValue = player.attributes[choice.stat];
  let chance = 52 + (statValue - choice.difficulty) * 1.2;
  chance += (player.confidence - 50) * 0.15;
  if (player.energy < 30) chance -= 12;
  else if (player.energy < 50) chance -= 5;
  return Math.round(clamp(chance, 8, 92));
}

export interface ChoiceResolution {
  success: boolean;
  skillCheck: boolean;
  chance: number;
  outcome: ChoiceOutcome;
}

export function resolveChoice(choice: EventChoice, player: Player): ChoiceResolution {
  const skillCheck = Boolean(choice.stat && choice.difficulty !== undefined && choice.fail);
  if (!skillCheck) {
    return { success: true, skillCheck: false, chance: 100, outcome: choice.success };
  }
  const chance = successChance(choice, player);
  const success = Math.random() * 100 < chance;
  return { success, skillCheck: true, chance, outcome: success ? choice.success : choice.fail! };
}
