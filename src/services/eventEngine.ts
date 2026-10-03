// ===================================================================
// Event engine: JSON loader, placeholder parser and sport-aware filter.
// Built to scale to 1,000+ events: every pool is filtered by sport and
// conditions, weighted, and de-duplicated against recently seen ids.
// ===================================================================

import preMatchJson from '../data/events/preMatchEvents.json';
import inGameJson from '../data/events/inGameEvents.json';
import postMatchJson from '../data/events/postMatchEvents.json';
import lifeJson from '../data/events/lifeEvents.json';
import { generatedEvents } from './eventGenerator';

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
import { calcOvr, clamp } from './playerUtils';
import { parseClock, scoreAt } from './matchEngine';

const GENERATED = generatedEvents();

/** Hand-written events plus generated situations (templates x contexts). */
export const EVENT_POOLS: Record<EventType, GameEvent[]> = {
  preMatch: [...(preMatchJson as GameEvent[]), ...GENERATED.preMatch],
  inGame: [...(inGameJson as GameEvent[]), ...GENERATED.inGame],
  postMatch: [...(postMatchJson as GameEvent[]), ...GENERATED.postMatch],
  life: [...(lifeJson as GameEvent[]), ...GENERATED.life],
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

const PLACEHOLDER_RE = /\{(שחקן|קבוצה|יריבה|עבודה|סוכן|משטח|ספורט|תוצאה|שופט|אצטדיון)\}/g;

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
      case 'תוצאה':
        return ctx.scoreLine ?? 'המשחק פתוח';
      case 'שופט':
        return ctx.referee ?? 'השופט';
      case 'אצטדיון':
        return ctx.venue ?? 'המגרש';
      default:
        return key;
    }
  });
}

/** Live score phrase for {תוצאה}, from the player's side. */
function scoreLine(state: Pick<GameState, 'player' | 'currentMatch'>, club: string): string | undefined {
  const match = state.currentMatch;
  if (!match || match.timeline.length === 0) return undefined;
  const { team, opp } = scoreAt(match.timeline, match.decisionMinutes[match.inGameIndex] ?? match.clock);
  const sep = state.player.sport === 'basketball' ? ':' : '-';
  if (team === opp) return `התוצאה שוויונית ${team}${sep}${opp}`;
  return team > opp ? `${club} ביתרון ${team}${sep}${opp}` : `${club} בפיגור ${team}${sep}${opp}`;
}

export function buildContext(state: Pick<GameState, 'player' | 'currentMatch'>, opponentOverride?: string): EventContext {
  const { player } = state;
  const club = state.currentMatch?.national ? NATIONAL_TEAM_NAME[state.currentMatch.national] : player.club;
  return {
    playerName: player.name,
    club,
    opponent: opponentOverride ?? state.currentMatch?.opponent ?? 'היריבה',
    job: getJob(player.jobId)?.name ?? 'מובטל',
    agent: getAgent(player.agentId)?.name ?? 'הסוכן',
    sport: player.sport,
    scoreLine: scoreLine(state, club),
    referee: state.currentMatch?.info?.referee,
    venue: state.currentMatch?.info?.venue,
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
  weather?: string;
  derby?: boolean;
}

export function isEligible(event: GameEvent, player: Player, extras: FilterExtras = {}): boolean {
  if (event.sport !== 'both' && event.sport !== player.sport) return false;
  const c = event.conditions;
  // A goalkeeper's match moments are keeper moments; outfield moments need an outfield player.
  if (event.type === 'inGame' && player.sport === 'football' && player.position === 'GK' && !c?.positions?.includes('GK')) return false;
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
  if (c.weather && (!extras.weather || !c.weather.includes(extras.weather))) return false;
  if (c.derby && !extras.derby) return false;
  const level = leagueLevel(player);
  if (c.minLevel !== undefined && level < c.minLevel) return false;
  if (c.maxLevel !== undefined && level > c.maxLevel) return false;
  if (c.minApps !== undefined && player.careerStats.apps < c.minApps) return false;
  if (c.minSeason !== undefined && player.history.length + 1 < c.minSeason) return false;
  if (c.minFollowers !== undefined && player.followers < c.minFollowers) return false;
  return true;
}

/** League level on one scale for both sports (basketball has no ליגה ג׳). */
export function leagueLevel(player: Pick<Player, 'sport' | 'division'>): number {
  return player.division + (player.sport === 'basketball' ? 1 : 0);
}

export function filterEvents(type: EventType, player: Player, extras: FilterExtras = {}): GameEvent[] {
  return EVENT_POOLS[type].filter((event) => !event.trigger && isEligible(event, player, extras));
}

/** Events tied to today's conditions (weather, derby) are more likely to come up. */
function eventWeight(e: GameEvent): number {
  const situational = e.conditions?.weather || e.conditions?.derby ? 3 : 1;
  return (e.weight ?? 1) * situational;
}

function weightedPick(events: GameEvent[]): GameEvent | null {
  if (events.length === 0) return null;
  const total = events.reduce((sum, e) => sum + eventWeight(e), 0);
  let roll = Math.random() * total;
  for (const event of events) {
    roll -= eventWeight(event);
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
export function pickInGameEvents(
  player: Player,
  seen: string[],
  count: number,
  opts: { weather?: string; derby?: boolean; noClutch?: boolean; minMinute?: number } = {},
): GameEvent[] {
  if (count <= 0) return [];
  const all = filterEvents('inGame', player, { weather: opts.weather, derby: opts.derby }).filter((e) => !(opts.noClutch && e.clutch));
  // Substitutes only see moments from the time they are on the pitch.
  const late = opts.minMinute ? all.filter((e) => (parseClock(e.clock, player.sport) ?? 0) >= opts.minMinute!) : all;
  const eligible = late.length >= count ? late : all;
  const fresh = eligible.filter((e) => !seen.includes(e.id));
  const pool = [...(fresh.length >= count ? fresh : eligible)];
  const picked: GameEvent[] = [];
  const usedTemplates = new Set<string>();
  let hasClutch = false;
  while (picked.length < count && pool.length > 0) {
    const event = weightedPick(pool)!;
    pool.splice(pool.indexOf(event), 1);
    // Never two variations of the same situation in one match.
    const template = event.id.replace(/_v\d+$/, '').replace(/__.*$/, '');
    if (usedTemplates.has(template)) continue;
    if (event.clutch) {
      if (hasClutch) continue;
      hasClutch = true;
    }
    usedTemplates.add(template);
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
