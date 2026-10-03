// ===================================================================
// Event generator: expands situation templates with match contexts into
// concrete events. A template is a core situation (e.g. "volley from the
// edge of the box"); a context changes the circumstances (minute, live
// score, weather, derby, fatigue...) and with them the text, clock,
// difficulty and rewards. Life templates expand with concrete variants.
// ===================================================================

import type { AttrKey, Effects, EventChoice, EventConditions, GameEvent, SportType } from '../types/game';
import inGameFootball from '../data/events/templates/inGameFootball.json';
import inGameBasketball from '../data/events/templates/inGameBasketball.json';
import inGameGoalkeeper from '../data/events/templates/inGameGoalkeeper.json';
import preMatchTemplates from '../data/events/templates/preMatchTemplates.json';
import postMatchTemplates from '../data/events/templates/postMatchTemplates.json';
import lifeTemplates from '../data/events/templates/lifeTemplates.json';
import contexts from '../data/events/templates/contexts.json';
import { hashString } from '../data/clubIdentity';

interface TemplateOutcome {
  text: string[];
  effects: Effects;
}
interface TemplateChoice {
  label: string;
  stat?: AttrKey;
  difficulty?: number;
  success: TemplateOutcome;
  fail?: TemplateOutcome;
}
interface Template {
  key: string;
  sport: SportType | 'both';
  scene: string;
  speaker?: string;
  title: string[];
  text: string[];
  tip?: string[];
  clutch?: boolean;
  clock?: string;
  conditions?: EventConditions;
  /** Only combine with these context ids (default: all). */
  contexts?: string[];
  vars?: Record<string, string[]>;
  choices: TemplateChoice[];
}
interface Context {
  id: string;
  text: string;
  tip?: string;
  range?: [number, number];
  mod?: Partial<Record<AttrKey | 'all', number>>;
  bonus?: Effects;
  conditions?: EventConditions;
  /** For post-match outlets */
  speaker?: string;
  reach?: number;
  /** Photo for interviews with this outlet (a local radio is not a press conference). */
  scene?: string;
}

const CTX = contexts as unknown as Record<string, Context[]>;
const QUARTER_WORDS = ['ראשון', 'שני', 'שלישי', 'רביעי'];

function clockFor(sport: SportType, id: string, range: [number, number]): string {
  const span = Math.max(1, range[1] - range[0]);
  const minute = range[0] + (hashString(id) % span);
  if (sport === 'football') return `דקה ${minute}`;
  const q = Math.min(3, Math.floor(minute / 10));
  const left = Math.max(1, (q + 1) * 10 * 60 - minute * 60 - (hashString(id + 's') % 50));
  return `רבע ${QUARTER_WORDS[q]}, ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

function mergeEffects(a: Effects, b?: Effects): Effects {
  if (!b) return a;
  const out: Effects = { ...a };
  for (const [k, v] of Object.entries(b) as Array<[keyof Effects, number]>) {
    if (typeof v === 'number') (out as Record<string, number>)[k] = ((a[k] as number | undefined) ?? 0) + v;
  }
  return out;
}

function mergeConditions(a?: EventConditions, b?: EventConditions): EventConditions | undefined {
  if (!a && !b) return undefined;
  return { ...(a ?? {}), ...(b ?? {}) };
}

function scaleEffects(e: Effects, reach: number): Effects {
  if (reach === 1) return e;
  const out: Effects = { ...e };
  if (out.followers) out.followers = Math.round(out.followers * reach);
  if (out.fanRep) out.fanRep = Math.round(out.fanRep * Math.min(reach, 1.5));
  return out;
}

const variant = <T,>(list: T[] | undefined, i: number): T | undefined => (list && list.length ? list[i % list.length] : undefined);

function buildChoice(c: TemplateChoice, i: number, ctx: Context | null, reach = 1): EventChoice {
  const mod = ctx?.mod ?? {};
  const delta = c.stat ? (mod[c.stat] ?? 0) + (mod.all ?? 0) : 0;
  return {
    label: c.label,
    stat: c.stat,
    difficulty: c.difficulty !== undefined ? c.difficulty + delta : undefined,
    success: { text: variant(c.success.text, i)!, effects: scaleEffects(mergeEffects(c.success.effects, ctx?.bonus), reach) },
    fail: c.fail ? { text: variant(c.fail.text, i)!, effects: scaleEffects(c.fail.effects, reach) } : undefined,
  };
}

function expandMatchTemplates(list: Template[], type: 'inGame' | 'preMatch', ctxKey: (t: Template) => string): GameEvent[] {
  const out: GameEvent[] = [];
  for (const t of list) {
    const pool = CTX[ctxKey(t)] ?? [];
    const usable = t.contexts ? pool.filter((c) => t.contexts!.includes(c.id)) : pool;
    usable.forEach((c, i) => {
      const id = `g_${t.key}__${c.id}`;
      const sport: SportType = t.sport === 'both' ? (ctxKey(t).includes('basketball') ? 'basketball' : 'football') : t.sport;
      out.push({
        id,
        type,
        sport: t.sport,
        scene: t.scene,
        speaker: t.speaker ?? (type === 'inGame' ? 'על המגרש' : 'חדר ההלבשה'),
        title: variant(t.title, i)!,
        text: `${c.text} ${variant(t.text, i)}`.trim(),
        tip: type === 'inGame' ? [variant(t.tip, i), c.tip].filter(Boolean).join(' ') : undefined,
        clock: type === 'inGame' ? (t.clutch ? t.clock : clockFor(sport, id, c.range ?? [10, 80])) : undefined,
        clutch: t.clutch,
        conditions: mergeConditions(t.conditions, c.conditions),
        choices: t.choices.map((ch) => buildChoice(ch, i, c)),
      });
    });
  }
  return out;
}

function expandPostMatch(list: Template[]): GameEvent[] {
  const outlets = CTX.postMatch ?? [];
  return list.flatMap((t) =>
    outlets.map((o, i) => ({
      id: `g_${t.key}__${o.id}`,
      type: 'postMatch' as const,
      sport: t.sport,
      scene: t.scene === 'press' && o.scene ? o.scene : t.scene,
      speaker: o.speaker ?? 'עיתונאי',
      title: variant(t.title, i)!,
      text: `${o.text} ${variant(t.text, i)}`.trim(),
      conditions: mergeConditions(t.conditions, o.conditions),
      choices: t.choices.map((ch) => buildChoice(ch, i, null, o.reach ?? 1)),
    })),
  );
}

function fillVars(text: string, vars: Record<string, string[]> | undefined, i: number): string {
  if (!vars) return text;
  return text.replace(/\{\$(\w+)\}/g, (m, k: string) => variant(vars[k], i) ?? m);
}

function expandLife(list: Template[]): GameEvent[] {
  const out: GameEvent[] = [];
  for (const t of list) {
    const count = t.vars ? Math.max(...Object.values(t.vars).map((v) => v.length)) : 1;
    for (let i = 0; i < count; i++) {
      const f = (s: string) => fillVars(s, t.vars, i);
      out.push({
        id: `g_${t.key}_v${i}`,
        type: 'life',
        sport: t.sport,
        scene: t.scene,
        speaker: f(t.speaker ?? 'הטלפון'),
        title: f(variant(t.title, i)!),
        text: f(variant(t.text, i)!),
        conditions: t.conditions,
        choices: t.choices.map((c) => {
          const built = buildChoice(c, i, null);
          return {
            ...built,
            label: f(built.label),
            success: { ...built.success, text: f(built.success.text) },
            fail: built.fail ? { ...built.fail, text: f(built.fail.text) } : undefined,
          };
        }),
      });
    }
  }
  return out;
}

let cached: Record<'inGame' | 'preMatch' | 'postMatch' | 'life', GameEvent[]> | null = null;

export function generatedEvents() {
  if (cached) return cached;
  const pre = preMatchTemplates as unknown as Template[];
  cached = {
    inGame: [
      ...expandMatchTemplates(inGameFootball as unknown as Template[], 'inGame', () => 'inGameFootball'),
      ...expandMatchTemplates(inGameGoalkeeper as unknown as Template[], 'inGame', () => 'inGameFootball'),
      ...expandMatchTemplates(inGameBasketball as unknown as Template[], 'inGame', () => 'inGameBasketball'),
    ],
    preMatch: [
      ...expandMatchTemplates(pre.filter((t) => t.sport !== 'basketball').map((t) => ({ ...t, sport: 'football' as const })), 'preMatch', () => 'preMatchFootball'),
      ...expandMatchTemplates(pre.filter((t) => t.sport !== 'football').map((t) => ({ ...t, key: `${t.key}_bb`, sport: 'basketball' as const })), 'preMatch', () => 'preMatchBasketball'),
    ],
    postMatch: expandPostMatch(postMatchTemplates as unknown as Template[]),
    life: expandLife(lifeTemplates as unknown as Template[]),
  };
  return cached;
}
