import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EVENT_POOLS, filterEvents, getAllEvents, parseText } from '../services/eventEngine';
import { gameReducer } from '../state/gameReducer';
import type { GameAction } from '../state/gameReducer';
import type { GameState, Position, SetupData, SportType } from '../types/game';
import { REGIONS } from '../data/clubs';
import { FOOTBALL_POSITIONS, BASKETBALL_POSITIONS, SEASON_MATCHDAYS } from '../data/sports';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name: string) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('event engine', () => {
  it('replaces every placeholder', () => {
    const text = parseText('{שחקן} {קבוצה} {יריבה} {עבודה} {סוכן} {משטח} {ספורט}', {
      playerName: 'דני',
      club: 'הפועל קצרין',
      opponent: 'מכבי מעלות',
      job: 'מאבטח',
      agent: 'אבי שמעוני',
      sport: 'basketball',
    });
    expect(text).toBe('דני הפועל קצרין מכבי מעלות מאבטח אבי שמעוני הפרקט כדורסל');
  });

  it('has well formed events', () => {
    const ids = new Set<string>();
    for (const [type, pool] of Object.entries(EVENT_POOLS)) {
      for (const event of pool) {
        expect(event.type).toBe(type);
        expect(ids.has(event.id)).toBe(false);
        ids.add(event.id);
        expect(event.choices).toHaveLength(3);
        for (const choice of event.choices) {
          if (choice.stat) expect(choice.fail, `${event.id} needs a fail outcome`).toBeDefined();
          expect(choice.success.text.length).toBeGreaterThan(0);
        }
        if (type === 'inGame') expect(event.tip, `${event.id} needs a scouting tip`).toBeTruthy();
      }
    }
    expect(getAllEvents().length).toBe(ids.size);
  });

  it('gives every position enough in-game scenarios', () => {
    const positions: Array<[SportType, Position]> = [
      ...FOOTBALL_POSITIONS.map((p) => ['football', p.id] as [SportType, Position]),
      ...BASKETBALL_POSITIONS.map((p) => ['basketball', p.id] as [SportType, Position]),
    ];
    for (const [sport, position] of positions) {
      const fake = { sport, position, division: 0, jobId: 'pizza', agentId: null, contract: 'amateur', attributes: {}, } as never;
      expect(filterEvents('inGame', fake).length, `${sport}/${position}`).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('zero emoji rule', () => {
  it('contains no emoji in source or data files', () => {
    const files = walk(join(__dirname, '..')).filter((f) => /\.(tsx?|json|css)$/.test(f));
    const emoji = /\p{Extended_Pictographic}/u;
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(emoji.test(content), file).toBe(false);
    }
  });
});

function autoplay(setup: SetupData, seasons: number) {
  let state: GameState | null = gameReducer(null, { type: 'NEW_GAME', setup });
  const dispatch = (action: GameAction) => {
    state = gameReducer(state, action);
  };
  let guard = 0;
  const seasonTables: number[][] = [];
  while (state!.season <= seasons && guard++ < 5000) {
    const s = state!;
    switch (s.phase) {
      case 'dashboard': {
        if (s.pendingLifeEventId) {
          if (s.lifeOutcome) dispatch({ type: 'LIFE_DISMISS' });
          else dispatch({ type: 'LIFE_CHOICE', index: guard % 3 });
          break;
        }
        if (s.player.contract !== 'pro' && !s.player.jobId) {
          dispatch({ type: 'CHOOSE_JOB', jobId: 'security' });
          break;
        }
        if (s.weekSlots > 0) {
          if (s.player.jobId && s.flags.shiftsThisWeek === 0 && s.player.energy > 30) dispatch({ type: 'WORK_SHIFT' });
          else if (s.player.energy > 40) dispatch({ type: 'TRAIN', option: 'skills' });
          else dispatch({ type: 'LIFESTYLE', option: 'rest' });
          dispatch({ type: 'CLEAR_TOAST' });
          if (state!.weekSlots === s.weekSlots) dispatch({ type: 'LIFESTYLE', option: 'family' });
          if (state!.weekSlots === s.weekSlots) dispatch({ type: 'START_MATCHDAY' });
          break;
        }
        dispatch({ type: 'START_MATCHDAY' });
        break;
      }
      case 'preMatch':
        dispatch(s.currentMatch?.pendingOutcome ? { type: 'PRE_CONTINUE' } : { type: 'PRE_CHOICE', index: guard % 3 });
        break;
      case 'inGame':
        dispatch(s.currentMatch?.pendingOutcome ? { type: 'INGAME_CONTINUE' } : { type: 'INGAME_CHOICE', index: guard % 3 });
        break;
      case 'matchSummary':
        expect(s.currentMatch?.result).toBeTruthy();
        dispatch({ type: 'SUMMARY_CONTINUE' });
        break;
      case 'postMatch':
        dispatch(s.currentMatch?.pendingOutcome ? { type: 'POST_CONTINUE' } : { type: 'POST_CHOICE', index: guard % 3 });
        break;
      case 'seasonEnd':
        seasonTables.push(s.league.teams.map((t) => t.played));
        dispatch({ type: 'SEASON_CONTINUE' });
        break;
      case 'transfer':
        if (s.transferOffers.length > 0 && guard % 2 === 0) dispatch({ type: 'ACCEPT_OFFER', offerId: s.transferOffers[0].id });
        else dispatch({ type: 'DECLINE_OFFERS' });
        break;
      default:
        throw new Error(`unexpected phase ${s.phase}`);
    }
  }
  expect(guard).toBeLessThan(5000);
  return { state: state!, seasonTables };
}

describe('full playthrough', () => {
  const cases: SetupData[] = [
    { name: 'דני כהן', sport: 'football', position: 'striker', region: 'golan', club: 'הפועל קצרין', jobId: 'pizza' },
    { name: 'נועה לוי', sport: 'basketball', position: 'PG', region: 'south', club: 'הפועל ערד', jobId: 'instructor' },
    { name: 'יוסי ביטון', sport: 'football', position: 'centerBack', region: 'jerusalem', club: 'מ.ס. ירושלים', jobId: 'factory' },
    { name: 'עומר חסון', sport: 'basketball', position: 'C', region: 'golan', club: 'מ.ס. חצור', jobId: 'mechanic' },
  ];
  for (const setup of cases) {
    it(`plays three seasons: ${setup.sport} ${setup.position}`, () => {
      expect(REGIONS.find((r) => r.id === setup.region)!.clubs[setup.sport].some((c) => c.name === setup.club)).toBe(true);
      for (let run = 0; run < 5; run++) {
        const { state, seasonTables } = autoplay(setup, 3);
        expect(state.season).toBe(4);
        expect(seasonTables.length).toBe(3);
        for (const played of seasonTables) {
          // Every team in the league plays exactly 12 games per season.
          for (const p of played) expect(p).toBe(SEASON_MATCHDAYS);
        }
        expect(state.player.history).toHaveLength(3);
        expect(Number.isFinite(state.player.budget)).toBe(true);
      }
    });
  }
});
