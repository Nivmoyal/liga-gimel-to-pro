import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EVENT_POOLS, filterEvents, getAllEvents, parseEvent, parseText } from '../services/eventEngine';
import { parseClock, scoreAt } from '../services/matchEngine';
import { gameReducer } from '../state/gameReducer';
import type { GameAction } from '../state/gameReducer';
import type { GameEvent, GameState, Position, SetupData, SportType } from '../types/game';
import { CLUB_POOLS } from '../data/clubs';
import localities from '../data/localities.json';
import { clubPlace, findPlace, nearestStartingClubs, searchPlaces, startingClubs } from '../data/places';
import { clubIdentity } from '../data/clubIdentity';
import { SPONSORS } from '../data/sponsors';
import { agentInterested, bestTrainingFor, migrateSave, runWeekPlan, sponsorBlocked, sponsorMissing } from '../state/gameLogic';
import { getAgent } from '../data/agents';
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

describe('situation catalogue', () => {
  it('has between 1,000 and 2,000 distinct situations', () => {
    const all = getAllEvents();
    expect(all.length).toBeGreaterThanOrEqual(1000);
    expect(all.length).toBeLessThanOrEqual(2000);
    // Within a sport, every situation reads differently.
    const texts = new Set(all.map((e) => `${e.sport}|${e.title}|${e.text}`));
    expect(texts.size).toBe(all.length);
  });

  it('resolves every placeholder in every situation', () => {
    const ctx = {
      playerName: 'דני כהן', club: 'הפועל קצרין', opponent: 'מכבי מעלות', job: 'מאבטח', agent: 'אבי שמעוני',
      sport: 'football' as const, scoreLine: 'התוצאה שוויונית 1-1', referee: 'יוסי לוי', venue: 'המגרש העירוני קצרין',
    };
    for (const event of getAllEvents()) {
      const parsed = parseEvent(event, ctx);
      const strings = [parsed.title, parsed.text, parsed.speaker, parsed.tip ?? '', ...parsed.choices.flatMap((c) => [c.label, c.success.text, c.fail?.text ?? ''])];
      for (const str of strings) expect(str.includes('{'), `${event.id}: ${str}`).toBe(false);
    }
  });

  it('gives every in-game situation a clock and clutch moments a late one', () => {
    for (const e of EVENT_POOLS.inGame) {
      if (!e.clock) continue;
      const m = parseClock(e.clock, e.sport === 'basketball' ? 'basketball' : 'football');
      expect(m, e.id).not.toBeNull();
      if (e.clutch) expect(m!, e.id).toBeGreaterThan(e.sport === 'basketball' ? 39 : 88);
    }
  });
});

describe('live match timeline', () => {
  it('ends with a score equal to the sum of its entries and no basketball ties', () => {
    for (const sport of ['football', 'basketball'] as const) {
      for (let run = 0; run < 30; run++) {
        let s: GameState | null = gameReducer(null, {
          type: 'NEW_GAME',
          setup: { name: 'בדיקה', shirtNumber: 8, sport, position: sport === 'football' ? 'ST' : 'SG', home: findPlace('תל אביב')!, club: sport === 'football' ? 'השקמה רמת חן' : 'אליצור גבעתיים', jobId: 'pizza' },
        });
        s = gameReducer(s, { type: 'START_MATCHDAY' });
        let guard = 0;
        while (s!.phase !== 'matchSummary' && guard++ < 50) {
          const st: GameState = s!;
          if (st.phase === 'preMatch') s = gameReducer(s, st.currentMatch!.pendingOutcome ? { type: 'PRE_CONTINUE' } : { type: 'PRE_CHOICE', index: run % 3 });
          else if (st.phase === 'live') s = gameReducer(s, { type: 'LIVE_ADVANCE' });
          else if (st.phase === 'inGame') s = gameReducer(s, st.currentMatch!.pendingOutcome ? { type: 'INGAME_CONTINUE' } : { type: 'INGAME_CHOICE', index: run % 3 });
        }
        const m = s!.currentMatch!;
        const total = scoreAt(m.timeline, Infinity);
        expect(m.result!.teamScore).toBe(total.team);
        expect(m.result!.oppScore).toBe(total.opp);
        if (sport === 'basketball') expect(total.team).not.toBe(total.opp);
        if (sport === 'football') expect(m.timeline.filter((e) => e.kind === 'goal').reduce((a, e) => a + e.team + e.opp, 0)).toBe(total.team + total.opp);
        // Decisions happen in chronological order.
        expect([...m.decisionMinutes].sort((a, b) => a - b)).toEqual(m.decisionMinutes);
      }
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
  let callUps = 0;
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
        const offer = SPONSORS.find((sp) => !sponsorBlocked(s.player, sp) && sponsorMissing(s.player, sp).length === 0);
        if (offer) {
          dispatch({ type: 'SIGN_SPONSOR', sponsorId: offer.id });
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
      case 'live':
        dispatch({ type: 'LIVE_ADVANCE' });
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
      case 'callUp':
        callUps += 1;
        dispatch(guard % 5 === 0 ? { type: 'DECLINE_CALLUP' } : { type: 'ACCEPT_CALLUP' });
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
  return { state: state!, seasonTables, callUps };
}

describe('save migration', () => {
  it('upgrades a version 1 save', () => {
    const fresh = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 5, sport: 'football', position: 'ST', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    const { shirtNumber: _n, sponsors: _s, national: _nat, isCaptain: _c2, home: _h, progress: _p, ...oldPlayer } = fresh.player;
    const { nationalCallUp: _c, ...oldState } = fresh;
    const migrated = migrateSave({ ...oldState, version: 1, player: { ...oldPlayer, region: 'north' } } as unknown as GameState)!;
    expect(migrated.version).toBe(7);
    expect(migrated.player.form).toEqual([]);
    expect(migrated.player.home.name).toBe('נהריה');
    expect('region' in migrated.player).toBe(false);
    expect(migrated.player.progress.attack).toBe(0);
    expect(migrated.player.shirtNumber).toBe(10);
    expect(migrated.player.isCaptain).toBe(false);
    expect(migrated.flags.captainOfferSeason).toBe(0);
    expect(migrated.player.sponsors).toEqual([]);
    expect(migrated.player.national.caps).toBe(0);
    expect(migrated.nationalCallUp).toBeNull();
  });
});

describe('long careers', () => {
  it('reach the national team and sign sponsors', () => {
    let callUps = 0;
    let caps = 0;
    let sponsorsSigned = 0;
    let captains = 0;
    for (let run = 0; run < 6; run++) {
      const { state, callUps: c } = autoplay(
        { name: 'נועה לוי', shirtNumber: 7, sport: run % 2 ? 'basketball' : 'football', position: run % 2 ? 'SG' : 'ST', home: findPlace('תל אביב')!, club: run % 2 ? 'אליצור גבעתיים' : 'השקמה רמת חן', jobId: 'security' },
        6,
      );
      callUps += c;
      caps += state.player.national.caps + state.player.national.u21Caps;
      captains += state.news.some((n) => n.text.includes('נבחר לקפטן')) || state.player.isCaptain ? 1 : 0;
      sponsorsSigned += state.news.filter((n) => n.text.includes('הפנים החדשות')).length + state.player.sponsors.length;
    }
    expect(callUps).toBeGreaterThan(0);
    expect(caps).toBeGreaterThan(0);
    expect(sponsorsSigned).toBeGreaterThan(0);
    expect(captains).toBeGreaterThan(0);
  });
});

describe('full playthrough', () => {
  const cases: SetupData[] = [
    { name: 'דני כהן', shirtNumber: 9, sport: 'football', position: 'ST', home: findPlace('קצרין')!, club: 'הפועל קצרין', jobId: 'pizza' },
    { name: 'נועה לוי', shirtNumber: 7, sport: 'basketball', position: 'PG', home: findPlace('ערד')!, club: 'הפועל ערד', jobId: 'instructor' },
    { name: 'יוסי ביטון', shirtNumber: 4, sport: 'football', position: 'CB', home: findPlace('ירושלים')!, club: 'מ.ס. ירושלים', jobId: 'factory' },
    { name: 'עומר חסון', shirtNumber: 13, sport: 'basketball', position: 'C', home: findPlace('קצרין')!, club: 'מ.ס. חצור', jobId: 'mechanic' },
  ];
  for (const setup of cases) {
    it(`plays three seasons: ${setup.sport} ${setup.position}`, () => {
      expect(startingClubs(setup.sport).some((c) => c.name === setup.club)).toBe(true);
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

describe('home town and nearby clubs', () => {
  it('finds typed places despite spelling variants', () => {
    expect(searchPlaces('קרית שמונה')[0].name).toBe('קריית שמונה');
    expect(searchPlaces('ת"א')[0].name).toBe('תל אביב');
    expect(searchPlaces('פתח תקוה')[0].name).toBe('פתח תקווה');
    expect(searchPlaces('באר שבא')[0].name).toBe('באר שבע');
    expect(searchPlaces('נצרת עילית')[0].name).toBe('נוף הגליל');
    expect(searchPlaces('x')).toEqual([]);
  });

  it('locates every club and sorts starting clubs by distance', () => {
    for (const pools of Object.values(CLUB_POOLS)) {
      for (const name of pools.flat()) expect(clubPlace(name), name).not.toBeNull();
    }
    const north = nearestStartingClubs('football', findPlace('קריית שמונה')!);
    expect(north[0].km).toBeLessThan(15);
    expect(['הפועל מטולה', 'הפועל צפון הגולן']).toContain(north[0].name);
    for (let i = 1; i < north.length; i++) expect(north[i].km).toBeGreaterThanOrEqual(north[i - 1].km);
    const south = nearestStartingClubs('basketball', findPlace('באר שבע')!);
    expect(south[0].km).toBeLessThan(15);
  });
});

describe('every Israeli locality', () => {
  it('finds small places and offers the clubs near them', () => {
    const merom = searchPlaces('מרום גולן')[0];
    expect(merom.name).toBe('מרום גולן');
    const golan = nearestStartingClubs('football', merom).slice(0, 3).map((c) => c.name);
    expect(golan).toContain('הפועל צפון הגולן');
    expect(golan).toContain('הפועל קצרין');
    const samar = searchPlaces('קיבוץ סמר')[0];
    expect(samar.name).toBe('סמר');
    for (const sport of ['football', 'basketball'] as const) {
      const near = nearestStartingClubs(sport, samar)[0];
      expect(near.km, sport).toBeLessThan(40);
      expect(near.name, sport).toMatch(/אילת|אילות/);
    }
  });

  it('has a starting club within reach of every locality', () => {
    for (const [name, lat, lon] of localities as Array<[string, number, number]>) {
      for (const sport of ['football', 'basketball'] as const) {
        expect(nearestStartingClubs(sport, { name, lat, lon })[0].km, `${name} ${sport}`).toBeLessThan(55);
      }
    }
  });

  it('builds regional lower leagues', () => {
    const s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 9, sport: 'football', position: 'ST', home: findPlace('אילת')!, club: 'הפועל אילת', jobId: 'pizza' },
    })!;
    const north = s.league.teams.filter((t) => (clubPlace(t.name)?.lat ?? 0) > 32.3);
    expect(north).toHaveLength(0);
  });
});

describe('gradual progress', () => {
  it('starts without sponsors and with a small following', () => {
    const s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 5, sport: 'football', position: 'ST', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    expect(s.player.followers).toBeLessThan(100);
    expect(SPONSORS.every((sp) => sponsorMissing(s.player, sp).length > 0)).toBe(true);
  });

  it('opens sponsors and agents by recent performances, not by time', () => {
    const s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 5, sport: 'football', position: 'ST', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    const pizza = SPONSORS.find((sp) => sp.id === 'sp_pizza')!;
    const avi = getAgent('agent_avi')!;
    const hot = { ...s.player, followers: 300, form: [7.6, 7.2, 8.1] };
    const cold = { ...hot, form: [6.1, 5.8, 6.4, 6.0, 6.2] };
    expect(sponsorMissing(hot, pizza)).toEqual([]);
    expect(sponsorMissing(cold, pizza).length).toBeGreaterThan(0);
    expect(agentInterested(avi, hot)).toBe(true);
    expect(agentInterested(avi, cold)).toBe(false);
    expect(agentInterested(avi, { ...hot, form: [9, 9] })).toBe(false);
  });

  it('raises attributes a fraction at a time', () => {
    let s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 5, sport: 'football', position: 'ST', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    const before = s.player.attributes.attack;
    s = gameReducer(s, { type: 'TRAIN', option: 'skills' })!;
    const gained = s.player.attributes.attack - before + s.player.progress.attack;
    expect(gained).toBeGreaterThan(0.05);
    expect(gained).toBeLessThan(0.55);
  });
});

describe('situations fit the career stage', () => {
  const textOf = (e: GameEvent) => [e.title, e.text, e.speaker, e.tip ?? '', ...e.choices.flatMap((c) => [c.label, c.success.text, c.fail?.text ?? ''])].join(' ');

  it('only mention the agent when there is one', () => {
    for (const e of getAllEvents()) {
      if (e.trigger) continue;
      if (/\{סוכן\}|(^|[^מ])הסוכן שלך/.test(textOf(e))) expect(e.conditions?.requiresAgent, e.id).toBe(true);
    }
  });

  it('keep press conferences, national papers and TV out of the bottom leagues', () => {
    const low = (e: GameEvent) => (e.conditions?.minLevel ?? e.conditions?.minDivision ?? 0) < 3 && !e.conditions?.contract?.includes('pro');
    for (const e of getAllEvents()) {
      if (e.trigger || e.type === 'inGame') continue;
      if (low(e)) {
        expect(e.speaker, e.id).not.toMatch(/ערוץ הספורט|העיתון הארצי/);
        expect(textOf(e), e.id).not.toMatch(/מסיבת העיתונאים|מסיבת עיתונאים/);
        if (e.type === 'postMatch') expect(e.scene, e.id).not.toBe('press');
      }
    }
  });

  it('gives a debutant in ליגה ג׳ a local interview, not a press conference', () => {
    const s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 9, sport: 'football', position: 'ST', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    const post = filterEvents('postMatch', s.player, { matchResult: 'win', matchday: 0 });
    expect(post.length).toBeGreaterThan(20);
    for (const e of post) {
      expect(e.speaker, e.id).not.toMatch(/ערוץ הספורט|העיתון הארצי|פודקאסט/);
      expect(textOf(e), e.id).not.toMatch(/סוכן|נבחרת|ויראלי/);
    }
  });
});

describe('weekly routine', () => {
  it('fills unused slots before the match, with position-based training by default', () => {
    let s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 4, sport: 'football', position: 'CB', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    expect(bestTrainingFor(s.player)).toBe('tactical');
    const before = s.player.progress.defense + s.player.attributes.defense;
    s = gameReducer(s, { type: 'START_MATCHDAY' })!;
    expect(s.weekSlots).toBe(0);
    expect(s.weekRecap?.length).toBe(3);
    expect(s.player.progress.defense + s.player.attributes.defense).toBeGreaterThan(before);
  });

  it('keeps the planned shifts and respects the chosen training', () => {
    let s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 9, sport: 'basketball', position: 'SG', home: findPlace('חולון')!, club: 'אליצור גבעתיים', jobId: 'security' },
    })!;
    s = gameReducer(s, { type: 'SET_WEEK_PLAN', plan: { shifts: 2, training: 'fitness' } })!;
    const budget = s.player.budget;
    const week = runWeekPlan(s);
    expect(week.state.flags.shiftsThisWeek).toBe(2);
    expect(week.state.player.budget).toBeGreaterThan(budget);
  });
});

describe('goalkeepers', () => {
  it('only get keeper moments in matches, and plenty of them', () => {
    const s = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'שוער', shirtNumber: 1, sport: 'football', position: 'GK', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    const moments = filterEvents('inGame', s.player);
    expect(moments.length).toBeGreaterThan(50);
    for (const e of moments) expect(e.conditions?.positions).toContain('GK');
    const outfield = { ...s.player, position: 'ST' as Position };
    expect(filterEvents('inGame', outfield).some((e) => e.conditions?.positions?.includes('GK'))).toBe(false);
  });

  it('plays full seasons as a keeper', () => {
    const { state } = autoplay({ name: 'שוער', shirtNumber: 1, sport: 'football', position: 'GK', home: findPlace('חיפה')!, club: 'הפועל יקנעם', jobId: 'security' }, 2);
    expect(state.season).toBe(3);
    expect(state.player.careerStats.goals).toBeLessThanOrEqual(1);
  });

  it('migrates old football positions', () => {
    const fresh = gameReducer(null, {
      type: 'NEW_GAME',
      setup: { name: 'בדיקה', shirtNumber: 5, sport: 'football', position: 'CB', home: findPlace('נהריה')!, club: 'בית״ר נהריה', jobId: 'pizza' },
    })!;
    const old = { ...fresh, version: 6, player: { ...fresh.player, position: 'fullBack' } } as unknown as GameState;
    expect(migrateSave(old)!.player.position).toBe('LB');
  });
});

describe('club identity', () => {
  it('gives every club a valid crest shape and shirt sponsor', () => {
    for (const pools of Object.values(CLUB_POOLS)) {
      for (const name of pools.flat()) {
        const id = clubIdentity(name);
        expect(['shield', 'round', 'crest']).toContain(id.shape);
        expect(id.shirtSponsor, name).toBeTruthy();
        expect(id.abbr.length, name).toBeGreaterThan(0);
      }
    }
  });
});
