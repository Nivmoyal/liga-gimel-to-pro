// ===================================================================
// Pure game state transitions. Every function takes a GameState and
// returns a new GameState; the reducer in gameReducer.ts wires them up.
// ===================================================================

import type {
  Agent,
  AttrKey,
  Attributes,
  Effects,
  GameEvent,
  GameFlags,
  GameState,
  JobId,
  MatchInfoState,
  MatchState,
  NationalCallUp,
  NationalLevel,
  NewsItem,
  ShopState,
  CupState,
  Cast,
  PendingOutcome,
  Player,
  SetupData,
  SportType,
} from '../types/game';
import { clubDistance, clubPlace, commuteCost, findPlace, startingClubs } from '../data/places';
import { getJob } from '../data/jobs';
import { AGENTS, getAgent } from '../data/agents';
import { MAX_SPONSORS, SPONSORS, getSponsor } from '../data/sponsors';
import type { Sponsor } from '../data/sponsors';
import { INTERNATIONAL_WINDOWS, NATIONAL_OPPONENTS, NATIONAL_SETUP, NATIONAL_TEAM_NAME } from '../data/national';
import {
  ATTR_KEYS,
  attrLabels,
  CONTRACT_LABEL,
  DIVISION_STRENGTH,
  OVR_WEIGHTS,
  SEASON_MATCHDAYS,
  TRANSFER_WINDOW_MATCHDAY,
  WEEK_SLOTS,
  divisionName,
  isProDivision,
  topDivision,
} from '../data/sports';
import { LIFESTYLE_OPTIONS, SOCIAL_POSTS, TRAINING_OPTIONS } from '../data/activities';
import { CLUB_POOLS } from '../data/clubs';
import { CUP_NAME, CUP_ROUNDS } from '../data/cup';
import { hashString } from '../data/clubIdentity';
import { LAST_SEASON_AGE, goalStatus, goalsOf, newAchievements, seasonGoalsFor } from '../services/careerEngine';
import { getShopItem } from '../data/shop';
import type { ShopId } from '../data/shop';
import type { LifestyleId, SocialPostId, TrainingId } from '../data/activities';
import {
  buildContext,
  STORY_IDS,
  getAllEvents,
  getEventById,
  getTriggeredEvent,
  isEligible,
  leagueLevel,
  parseEvent,
  pickTriggeredEvent,
  pickEvent,
  pickInGameEvents,
  resolveChoice,
} from '../services/eventEngine';
import type { FilterExtras, Standing } from '../services/eventEngine';
import {
  applyResult,
  createLeague,
  fixtureFor,
  playerClubIndex,
  playerClubPosition,
  simulateOtherFixtures,
  sortedTable,
} from '../services/leagueEngine';
import {
  applyMatchEffects,
  createMatchState,
  decisionEntries,
  determineRole,
  finalizeFromTimeline,
  inGameEventCount,
  kickoff,
  overtimeIfTied,
  planDecisionMinutes,
  prepareClutch,
} from '../services/matchEngine';
import { matchInfo, rosterFor } from '../services/rosterEngine';
import { leagueRoundNews, makeNews, matchNews, rumorNews } from '../services/newsEngine';
import { baseSalary, contractForDivision, generateOffers } from '../services/transferEngine';
import {
  applyPlayerEffects,
  averageRating,
  calcOvr,
  clamp,
  emptyStats,
  formatMoney,
  pickRandom,
  randInt,
  scaleFame,
  recentForm,
  addProgress,
  trainingProgress,
} from '../services/playerUtils';

export const SAVE_VERSION = 7;
const MAX_NEWS = 60;
/** New followers per point of "buzz" after a good match, by division. */
const MATCH_AUDIENCE: Record<SportType, number[]> = {
  football: [5, 12, 35, 90, 240],
  basketball: [6, 15, 60, 200],
};
/** Event ids remembered so whole pools of situations are used before any comes back. */
const SEEN_MEMORY = 500;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function defaultFlags(): GameFlags {
  return {
    agentDiscovered: false,
    eliteAgentOffered: false,
    captainOfferSeason: 0,
    postedThisWeek: false,
    shiftsThisWeek: 0,
    jobWarnings: 0,
    raiseAskedSeason: 0,
    transferPush: false,
    ownsBoots: false,
    jobRaise: 0,
  };
}

function addNews(state: GameState, items: Array<NewsItem | null | undefined>): GameState {
  const valid = items.filter((i): i is NewsItem => Boolean(i));
  if (valid.length === 0) return state;
  return { ...state, news: [...valid.reverse(), ...state.news].slice(0, MAX_NEWS) };
}

function newsNow(state: GameState, category: NewsItem['category'], text: string): NewsItem {
  return makeNews(category, text, state.season, state.matchday);
}

/** Where the player's club stands in the table (promotion places, relegation places or between). */
function standingOf(state: GameState): Standing | undefined {
  if (state.matchday < 3) return undefined;
  const position = playerClubPosition(state.league);
  if (position <= 2) return 'top';
  if (position >= state.league.teams.length - 1) return 'bottom';
  return 'mid';
}

/** Table and opponent facts the situations can depend on. */
function matchExtras(state: GameState, opponent: string | undefined): FilterExtras {
  const { player } = state;
  return {
    matchday: state.matchday,
    standing: standingOf(state),
    formerClub: Boolean(opponent && opponent !== player.club && player.history.some((h) => h.club === opponent)),
    rivalMatch: Boolean(opponent && opponent === castOf(state).rivalClub),
  };
}

// ------------------------------------------------------------------
// Recurring people
// ------------------------------------------------------------------

/** The best friend in the dressing room and a personal rival at another club of the league. */
function makeCast(state: Pick<GameState, 'player' | 'league'>): Cast {
  const { player, league } = state;
  const h = hashString(`${player.name}|${player.club}`);
  const mates = rosterFor(player.club, player.sport, player.division).filter((p) => p.name !== player.name);
  const others = league.teams.filter((t) => !t.isPlayerClub);
  const rivalClub = others[h % Math.max(1, others.length)]?.name ?? 'היריבה';
  const rivals = rosterFor(rivalClub, player.sport, player.division).filter((p) => p.pos !== 'שוער');
  return {
    friend: mates[(h >> 4) % Math.max(1, mates.length)]?.name ?? 'החבר הכי טוב שלך',
    rival: rivals[(h >> 7) % Math.max(1, rivals.length)]?.name ?? 'היריב',
    rivalClub,
  };
}

export function castOf(state: Pick<GameState, 'player' | 'league' | 'cast'>): Cast {
  return state.cast ?? makeCast(state);
}

/** The rival follows the player: when the leagues part, he moves to a club of the new league. */
function keepRivalClose(state: GameState): GameState {
  const cast = castOf(state);
  if (state.league.teams.some((t) => t.name === cast.rivalClub && !t.isPlayerClub)) return { ...state, cast };
  const others = state.league.teams.filter((t) => !t.isPlayerClub);
  if (others.length === 0) return { ...state, cast };
  const rivalClub = pickRandom(others).name;
  const next: GameState = { ...state, cast: { ...cast, rivalClub } };
  return addNews(next, [newsNow(next, 'rumors', `${cast.rival} עבר ל${rivalClub}. הדרכים של ${state.player.name} ושלו נפגשות שוב`)]);
}

function markSeen(state: GameState, id: string): GameState {
  const event = getEventById(id);
  const flags = event?.conditions?.once ? { ...state.flags, usedOnce: [...(state.flags.usedOnce ?? []), id] } : state.flags;
  return { ...state, flags, seenEvents: [id, ...state.seenEvents.filter((s) => s !== id)].slice(0, SEEN_MEMORY) };
}

function withToast(state: GameState, toast: string): GameState {
  return { ...state, toast };
}

/** Applies player effects plus side effects such as news items. */
function applyEffects(state: GameState, effects: Effects): GameState {
  let next: GameState = { ...state, player: applyPlayerEffects(state.player, effects) };
  if (effects.news) next = addNews(next, [newsNow(next, effects.news.category, effects.news.text)]);
  if (effects.setAgent) {
    next = { ...next, flags: { ...next.flags, agentDiscovered: true } };
  }
  if (effects.setCaptain) next = { ...next, flags: { ...next.flags, wasCaptain: true } };
  if (effects.setCaptain && !state.player.isCaptain) {
    next = addNews(next, [
      newsNow(next, 'club', `רשמי: ${next.player.name} נבחר לקפטן של ${next.player.club}`),
      newsNow(next, 'fans', next.player.sport === 'football' ? `סרט הקפטן על הזרוע של ${next.player.name}. האוהדים מתרגשים` : `${next.player.name} הוא הקפטן החדש. האוהדים מתרגשים`),
    ]);
  }
  return next;
}

/** Keeps the ratings of the last matches played. */
function pushForm(player: Player, rating: number): number[] {
  return [...(player.form ?? []), Math.round(rating * 10) / 10].slice(-6);
}

/**
 * Minutes on the pitch teach things training cannot, and only good
 * performances really move a player forward.
 */
function matchExperience(player: Player, role: MatchState['role'], rating: number): Player {
  const weights = OVR_WEIGHTS[player.position];
  const top = [...ATTR_KEYS].sort((a, b) => weights[b] - weights[a]).slice(0, 2);
  const base = (role === 'starter' ? 1 : 0.6) * clamp((rating - 5.8) * 0.1, 0, 0.25);
  if (base <= 0) return player;
  const gains: Partial<Attributes> = {};
  for (const key of [...top, 'mental' as AttrKey]) gains[key] = trainingProgress(player, key, base);
  return addProgress(player, gains).player;
}

/** The most important attribute for the position that still has room to grow. */
function breakthroughAttr(player: Player): AttrKey | null {
  const weights = OVR_WEIGHTS[player.position];
  const ranked = [...ATTR_KEYS].sort((a, b) => weights[b] - weights[a]);
  return ranked.slice(0, 3).find((k) => player.attributes[k] < Math.min(99, player.potential + 3)) ?? null;
}

function emptyNational() {
  return { caps: 0, u21Caps: 0, goals: 0, assists: 0, points: 0, ratingSum: 0 };
}

function emptyProgress(): Attributes {
  return { attack: 0, technique: 0, playmaking: 0, defense: 0, physical: 0, mental: 0 };
}

/** Football positions before the full 12-position list. */
const LEGACY_POSITION: Record<string, string> = { striker: 'ST', midfielder: 'CM', centerBack: 'CB', fullBack: 'LB' };

/** Old saves had a region instead of a typed home town. */
const REGION_HOME: Record<string, string> = {
  golan: 'קצרין',
  north: 'נהריה',
  sharon: 'נתניה',
  center: 'תל אביב',
  jerusalem: 'ירושלים',
  south: 'באר שבע',
};

/** Upgrades older saves in place so existing careers keep working. */
export function migrateSave(raw: GameState): GameState | null {
  if (!raw?.player) return null;
  if (raw.version === SAVE_VERSION) return raw;
  if (raw.version < 1 || raw.version > 6) return null;
  // Saves before v4 cannot resume a match mid-way: the match restarts from the dashboard.
  const midMatch = raw.version < 4 && ['preMatch', 'inGame', 'matchSummary', 'postMatch'].includes(raw.phase);
  const legacy = raw.player as Player & { region?: string };
  const home =
    legacy.home ??
    findPlace(REGION_HOME[legacy.region ?? ''] ?? '') ??
    clubPlace(legacy.club) ?? { name: 'תל אביב', lat: 32.08, lon: 34.78 };
  const { region: _region, ...player } = legacy;
  return {
    ...raw,
    version: SAVE_VERSION,
    phase: midMatch ? 'dashboard' : raw.phase,
    nationalCallUp: midMatch ? null : (raw.nationalCallUp ?? null),
    currentMatch: raw.version < 4 ? null : raw.currentMatch,
    flags: { ...raw.flags, captainOfferSeason: raw.flags.captainOfferSeason ?? 0 },
    player: {
      ...player,
      home,
      progress: player.progress ?? emptyProgress(),
      form: player.form ?? [],
      position: (LEGACY_POSITION[player.position as string] ?? player.position) as Player['position'],
      shirtNumber: player.shirtNumber ?? 10,
      isCaptain: player.isCaptain ?? false,
      sponsors: player.sponsors ?? [],
      national: player.national ?? emptyNational(),
    },
  };
}

export function isNonPro(player: Player): boolean {
  return player.contract !== 'pro';
}

export function playerClubStrength(state: GameState): number {
  const idx = playerClubIndex(state.league);
  return state.league.teams[idx]?.strength ?? DIVISION_STRENGTH[state.player.sport][state.player.division];
}

/** An agent calls when the player's recent performances and level catch their eye. */
export function agentInterested(agent: Agent, player: Player): boolean {
  const form = recentForm(player);
  const want = agent.interest;
  if (form === null || form < want.form) return false;
  const caps = player.national.caps + player.national.u21Caps;
  if (want.division !== undefined && player.division < want.division && caps === 0) return false;
  if (want.motm !== undefined && player.careerStats.motm < want.motm) return false;
  if (want.nationalCaps !== undefined && caps < want.nationalCaps) return false;
  return true;
}

export function agentUnlockReady(player: Player): boolean {
  return AGENTS.some((agent) => agentInterested(agent, player));
}

/** Returns why the matchday cannot start, or null when it can. */
export function matchdayBlocker(state: GameState): string | null {
  if (state.pendingLifeEventId) return 'יש הודעה שמחכה לתשובה שלך';
  if (isNonPro(state.player) && !state.player.jobId) return 'בליגות הנמוכות חייבים עבודה אזרחית. בחרו עבודה.';
  return null;
}

// ------------------------------------------------------------------
// New game
// ------------------------------------------------------------------

function initialAttributes(setup: SetupData, divisionStrength: number): Attributes {
  const weights = OVR_WEIGHTS[setup.position];
  const attrs = {} as Attributes;
  for (const key of ATTR_KEYS) {
    attrs[key] = clamp(Math.round(divisionStrength - 4 + weights[key] * 40 + randInt(-3, 3)), 20, 80);
  }
  return attrs;
}

export function createNewGame(setup: SetupData): GameState {
  const options = startingClubs(setup.sport);
  const club = options.find((c) => c.name === setup.club) ?? options[0];
  const division = club.division;
  const divStrength = DIVISION_STRENGTH[setup.sport][division];
  const contract = contractForDivision(setup.sport, division);

  const player: Player = {
    name: setup.name.trim(),
    shirtNumber: clamp(Math.round(setup.shirtNumber) || 10, 0, 99),
    isCaptain: false,
    sport: setup.sport,
    position: setup.position,
    home: setup.home,
    club: club.name,
    division,
    contract,
    weeklySalary: baseSalary(setup.sport, division),
    attributes: initialAttributes(setup, divStrength),
    progress: emptyProgress(),
    potential: randInt(72, 90),
    age: 19,
    budget: 1500,
    energy: 85,
    coachApproval: 50,
    fanRep: 20,
    teamMorale: 55,
    confidence: 50,
    followers: randInt(30, 90),
    jobId: setup.jobId,
    agentId: null,
    injuryWeeks: 0,
    seasonStats: emptyStats(),
    careerStats: emptyStats(),
    form: [],
    history: [],
    sponsors: [],
    national: emptyNational(),
  };

  const league = createLeague(setup.sport, division, club.name, divStrength + randInt(-3, 3));

  let state: GameState = {
    version: SAVE_VERSION,
    phase: 'dashboard',
    player,
    league,
    season: 1,
    matchday: 0,
    weekSlots: WEEK_SLOTS,
    pendingLifeEventId: null,
    lifeOutcome: null,
    currentMatch: null,
    news: [],
    seenEvents: [],
    transferOffers: [],
    transferContext: null,
    seasonSummary: null,
    nationalCallUp: null,
    flags: defaultFlags(),
    toast: null,
  };
  state = { ...state, cast: makeCast(state), goals: { season: 1, items: seasonGoalsFor(state) } };

  const job = getJob(setup.jobId);
  state = addNews(state, [
    newsNow(state, 'club', `רשמי: ${player.name} מצטרף ל${player.club} לקראת העונה ב${divisionName(player.sport, division)}`),
    newsNow(state, 'league', `העונה ב${divisionName(player.sport, division)} נפתחת. 13 קבוצות, 12 מחזורים, שתיים עולות ליגה.`),
    newsNow(state, 'fans', `אוהדי ${player.club} סקרנים לראות את הרכש החדש בעמדת ${positionWord(player)}`),
    job ? newsNow(state, 'rumors', `שמועה: ${player.name} עובד בבקרים בתור ${job.name} כדי לממן את החלום`) : null,
  ]);
  return state;
}

function positionWord(player: Player): string {
  const map: Record<string, string> = {
    GK: 'השוער',
    LB: 'המגן השמאלי',
    CB: 'הבלם',
    RB: 'המגן הימני',
    LWB: 'מגן הכנף השמאלי',
    RWB: 'מגן הכנף הימני',
    CDM: 'הקשר האחורי',
    CM: 'הקשר המרכזי',
    CAM: 'הקשר ההתקפי',
    LW: 'הכנף השמאלית',
    RW: 'הכנף הימנית',
    ST: 'החלוץ',
    PG: 'הרכז',
    SG: 'הקלעי',
    SF: 'הסמול פורוורד',
    PF: 'הפאוור פורוורד',
    C: 'הסנטר',
  };
  return map[player.position] ?? '';
}

// ------------------------------------------------------------------
// Weekly activities (each consumes a week slot unless noted)
// ------------------------------------------------------------------

function useSlot(state: GameState): GameState | null {
  if (state.weekSlots <= 0) return null;
  return { ...state, weekSlots: state.weekSlots - 1 };
}

export function train(state: GameState, id: TrainingId): GameState {
  const option = TRAINING_OPTIONS.find((o) => o.id === id);
  if (!option) return state;
  const { player } = state;
  if (player.injuryWeeks > 0) return withToast(state, 'אתה פצוע. הרופא אסר על אימונים השבוע.');
  if (player.energy < option.energyCost) return withToast(state, 'אין מספיק אנרגיה לאימון הזה.');
  if (player.budget < option.budgetCost) return withToast(state, 'אין מספיק תקציב.');
  const slotted = useSlot(state);
  if (!slotted) return withToast(state, 'נגמר הזמן השבוע. עולים למחזור הבא.');

  // Position-based gains for the private coach session
  let gains = player.position === 'GK' && option.keeperGains ? option.keeperGains : option.gains;
  if (Object.keys(gains).length === 0) {
    const weights = OVR_WEIGHTS[player.position];
    const top = [...ATTR_KEYS].sort((a, b) => weights[b] - weights[a]).slice(0, 2);
    gains = { [top[0]]: 0.55, [top[1]]: 0.42 };
  }
  const progressGain: Partial<Attributes> = {};
  for (const key of ATTR_KEYS) {
    const base = gains[key];
    if (base) progressGain[key] = trainingProgress(player, key, base);
  }

  const riskyInjury = player.energy < 30 && option.energyCost >= 14 && Math.random() < 0.18;
  let next = applyEffects(slotted, {
    energy: -option.energyCost,
    budget: -option.budgetCost,
    coachApproval: option.coachApproval,
    confidence: option.confidence,
    injuryWeeks: riskyInjury ? randInt(1, 2) : undefined,
  });
  if (riskyInjury) {
    next = addNews(next, [newsNow(next, 'club', `${player.name} נפצע באימון אחרי שהתאמן עייף. הוא יחמיץ את המחזורים הקרובים.`)]);
    return withToast(next, 'התאמנת עייף מדי ונפצעת. צריך לנוח.');
  }
  const { player: trained, raised } = addProgress(next.player, progressGain);
  next = { ...next, player: trained };
  return withToast(next, trainingToast(player, trained, progressGain, raised));
}

/** "+0.4 גימור (70% לנקודה הבאה)" style summary of a session. */
function trainingToast(before: Player, after: Player, gains: Partial<Attributes>, raised: AttrKey[]): string {
  const labels = attrLabels(after.sport, after.position);
  const parts = (Object.keys(gains) as AttrKey[]).map((key) => {
    if (raised.includes(key)) return `${labels[key]} עלה ל-${after.attributes[key]}`;
    return `${labels[key]} +${Math.max(1, Math.round(gains[key]! * 100))}% (${Math.round(after.progress[key] * 100)}% לנקודה הבאה)`;
  });
  const ovrBefore = calcOvr(before);
  const ovrAfter = calcOvr(after);
  const head = ovrAfter > ovrBefore ? `שיפור! הדירוג הכללי עלה ל-${ovrAfter}. ` : raised.length > 0 ? 'עלית נקודה! ' : '';
  return `${head}${parts.join(' | ')}`;
}

export function lifestyle(state: GameState, id: LifestyleId): GameState {
  const option = LIFESTYLE_OPTIONS.find((o) => o.id === id);
  if (!option) return state;
  if (state.player.budget < option.budgetCost) return withToast(state, 'אין מספיק תקציב.');
  if (option.energy < 0 && state.player.energy < -option.energy) return withToast(state, 'אין לך כוח לזה עכשיו.');
  const slotted = useSlot(state);
  if (!slotted) return withToast(state, 'נגמר הזמן השבוע. עולים למחזור הבא.');
  let next = applyEffects(slotted, {
    budget: -option.budgetCost,
    energy: option.energy,
    confidence: option.confidence,
    fanRep: option.fanRep,
    attributes: option.attributes,
  });
  if (option.progress) {
    const gains: Partial<Attributes> = {};
    for (const key of Object.keys(option.progress) as AttrKey[]) gains[key] = trainingProgress(next.player, key, option.progress[key]!);
    const { player, raised } = addProgress(next.player, gains);
    next = { ...next, player };
    if (raised.length > 0) return withToast(next, `${option.label}: ${attrLabels(player.sport, player.position)[raised[0]]} עלה ל-${player.attributes[raised[0]]}.`);
  }
  return withToast(next, `${option.label}: בוצע.`);
}

// ------------------------------------------------------------------
// Shop: things money buys
// ------------------------------------------------------------------

export function shopOf(state: GameState): ShopState {
  return state.shop ?? { owned: state.flags.ownsBoots ? ['boots'] : [], weekly: [], gifts: {} };
}

/** What a purchase does right away (weekly services act at the end of each matchday). */
const PURCHASE_EFFECTS: Partial<Record<ShopId, Effects>> = {
  boots: { attributes: { technique: 1, attack: 1 }, confidence: 4 },
  family_help: { confidence: 6 },
  kids_gear: { fanRep: 5, followers: 100 },
  luxury_car: { followers: 600, confidence: 5, fanRep: -3 },
  parents_house: { confidence: 10, fanRep: 4, followers: 300 },
};

const PURCHASE_NEWS: Partial<Record<ShopId, (name: string) => string>> = {
  family_help: (n) => `${n} עוזר למשפחה. אמא שלו מספרת לשכנות על הבן שלה`,
  kids_gear: (n) => `${n} תרם כדורים וחולצות לילדים במגרש השכונתי שבו התחיל`,
  luxury_car: (n) => `${n} הגיע לאימון ברכב חדש ונוצץ. ברשתות כבר מדברים`,
  parents_house: (n) => `${n} קנה בית להורים. "הבטחתי לאמא כשהייתי ילד"`,
  foundation: (n) => `${n} מקים קרן שתממן חוגי ספורט לילדים בפריפריה`,
};

export function buyItem(state: GameState, id: ShopId): GameState {
  const item = getShopItem(id);
  if (!item) return state;
  const shop = shopOf(state);
  if (item.minLevel !== undefined && leagueLevel(state.player) < item.minLevel) return withToast(state, 'עוד מוקדם בשביל זה.');
  if (item.kind === 'own' && shop.owned.includes(id)) return withToast(state, 'כבר יש לך את זה.');
  if (item.kind === 'weekly' && shop.weekly.includes(id)) return withToast(state, 'השירות כבר פעיל.');
  if (item.kind === 'gift' && shop.gifts[id] === state.season) return withToast(state, 'כבר נתת העונה. אפשר שוב בעונה הבאה.');
  if (state.player.budget < item.price) return withToast(state, 'אין מספיק כסף.');
  // Weekly services are paid at the end of every matchday, starting this week.
  let next = applyEffects(state, { ...(item.kind === 'weekly' ? {} : { budget: -item.price }), ...PURCHASE_EFFECTS[id] });
  const nextShop: ShopState =
    item.kind === 'own'
      ? { ...shop, owned: [...shop.owned, id] }
      : item.kind === 'weekly'
        ? { ...shop, weekly: [...shop.weekly, id] }
        : { ...shop, gifts: { ...shop.gifts, [id]: state.season } };
  next = { ...next, shop: nextShop, flags: id === 'boots' ? { ...next.flags, ownsBoots: true } : next.flags };
  const story = PURCHASE_NEWS[id];
  if (story) next = addNews(next, [newsNow(next, 'fans', story(next.player.name))]);
  return withToast(next, item.kind === 'weekly' ? `${item.title}: פעיל. ${formatMoney(item.price)} בסוף כל מחזור.` : `${item.title}: ${item.effect}.`);
}

export function cancelItem(state: GameState, id: ShopId): GameState {
  const shop = shopOf(state);
  if (!shop.weekly.includes(id)) return state;
  return withToast({ ...state, shop: { ...shop, weekly: shop.weekly.filter((w) => w !== id) } }, `${getShopItem(id)?.title ?? ''}: בוטל.`);
}

/** Weekly services: paid after the matchday, then they do their work. Unaffordable ones stop. */
function runWeeklyShop(state: GameState, player: Player, news: NewsItem[], matchday: number): { player: Player; shop: ShopState } {
  const shop = shopOf(state);
  const kept: ShopId[] = [];
  let p = player;
  const progress: Partial<Attributes> = {};
  const addGain = (key: AttrKey, base: number) => {
    progress[key] = (progress[key] ?? 0) + trainingProgress(p, key, base);
  };
  for (const id of shop.weekly) {
    const item = getShopItem(id);
    if (!item) continue;
    if (p.budget < item.price) {
      news.push(makeNews('rumors', `${p.name} הפסיק את ${item.title}: אין מספיק כסף השבוע`, state.season, matchday));
      continue;
    }
    kept.push(id);
    p = { ...p, budget: p.budget - item.price };
    if (id === 'apartment') p.energy = clamp(p.energy + 5, 0, 100);
    if (id === 'fitness_coach') {
      p.energy = clamp(p.energy + 5, 0, 100);
      addGain('physical', 0.2);
    }
    if (id === 'skills_coach') {
      const weights = OVR_WEIGHTS[p.position];
      const top = [...ATTR_KEYS].sort((a, b) => weights[b] - weights[a]).slice(0, 2);
      addGain(top[0], 0.22);
      addGain(top[1], 0.16);
    }
    if (id === 'physio') {
      p.energy = clamp(p.energy + 10, 0, 100);
      if (p.injuryWeeks > 1) p.injuryWeeks -= 1;
    }
    if (id === 'mental_coach') {
      p.confidence = clamp(p.confidence + 3, 0, 100);
      addGain('mental', 0.15);
    }
    if (id === 'foundation') {
      p.fanRep = clamp(p.fanRep + 2, 0, 100);
      p.followers += 60;
    }
  }
  if (shop.owned.includes('home_gym')) addGain('physical', 0.12);
  if (Object.keys(progress).length > 0) p = addProgress(p, progress).player;
  return { player: p, shop: { ...shop, weekly: kept } };
}

export function chooseJob(state: GameState, jobId: JobId): GameState {
  const job = getJob(jobId);
  if (!job) return state;
  let next: GameState = { ...state, player: { ...state.player, jobId }, flags: { ...state.flags, jobWarnings: 0, jobRaise: 0 } };
  next = addNews(next, [newsNow(next, 'rumors', `${state.player.name} התחיל לעבוד בתור ${job.name}`)]);
  return withToast(next, `התחלת לעבוד בתור ${job.name}.`);
}

export function quitJob(state: GameState): GameState {
  if (!state.player.jobId) return state;
  const next: GameState = { ...state, player: { ...state.player, jobId: null }, flags: { ...state.flags, jobWarnings: 0, jobRaise: 0 } };
  return withToast(next, isNonPro(state.player) ? 'התפטרת. בלי עבודה לא תוכל לעלות למחזור הבא.' : 'התפטרת מהעבודה.');
}

export function workShift(state: GameState): GameState {
  const job = getJob(state.player.jobId);
  if (!job) return withToast(state, 'אין לך עבודה כרגע.');
  if (state.player.injuryWeeks > 0 && job.energyCost >= 20) return withToast(state, 'אתה פצוע. עבודה פיזית תחמיר את הפציעה.');
  if (state.player.energy < job.energyCost) return withToast(state, 'אין מספיק אנרגיה למשמרת.');
  const slotted = useSlot(state);
  if (!slotted) return withToast(state, 'נגמר הזמן השבוע. עולים למחזור הבא.');
  const pay = job.payPerShift + state.flags.jobRaise;
  const perkApplies = Object.keys(job.perk.effects).length > 0 && Math.random() < 0.4;
  let next = applyEffects(slotted, { budget: pay, energy: -job.energyCost, ...(perkApplies ? job.perk.effects : {}) });
  next = { ...next, flags: { ...next.flags, shiftsThisWeek: next.flags.shiftsThisWeek + 1, jobWarnings: 0 } };
  return withToast(next, `משמרת הושלמה: +${formatMoney(pay)}${perkApplies ? ` | ${job.perk.label}` : ''}`);
}

export function askRaise(state: GameState): GameState {
  if (!state.player.jobId) return state;
  if (state.flags.raiseAskedSeason === state.season) return withToast(state, 'כבר ביקשת העלאה העונה.');
  const chance = clamp(30 + (state.player.attributes.mental - 40) * 1.2, 10, 85);
  const success = Math.random() * 100 < chance;
  const flags = { ...state.flags, raiseAskedSeason: state.season, jobRaise: state.flags.jobRaise + (success ? 60 : 0) };
  return withToast({ ...state, flags }, success ? 'הבוס הסכים: +₪60 לכל משמרת.' : 'הבוס סירב. אולי בעונה הבאה.');
}

export function socialPost(state: GameState, id: SocialPostId): GameState {
  const option = SOCIAL_POSTS.find((o) => o.id === id);
  if (!option) return state;
  if (state.flags.postedThisWeek) return withToast(state, 'כבר פרסמת השבוע. אל תציף את הפיד.');
  if (state.player.followers < option.minFollowers) return withToast(state, `צריך לפחות ${option.minFollowers} עוקבים.`);
  // A post travels further after strong performances
  const form = recentForm(state.player);
  const reach = (1 + state.player.fanRep / 100) * (form === null ? 0.5 : clamp((form - 5.5) / 1.5, 0.3, 1.6));
  let effects: Effects = {};
  let msg = '';
  switch (id) {
    case 'training':
      effects = { followers: Math.round(randInt(40, 120) * reach), fanRep: 1, coachApproval: 1 };
      msg = 'הסרטון מהאימון רץ יפה.';
      break;
    case 'fans':
      effects = { followers: Math.round(randInt(15, 50) * reach), fanRep: 4 };
      msg = 'האוהדים מתים על הפוסט.';
      break;
    case 'lifestyle':
      effects = { followers: Math.round(randInt(80, 220) * reach), coachApproval: -1, confidence: 2 };
      msg = 'המון צפיות. המאמן פחות התלהב.';
      break;
    case 'sponsored': {
      const pay = Math.min(4000, Math.round(state.player.followers * 0.3));
      effects = { budget: pay, followers: randInt(10, 40), fanRep: -1 };
      msg = `פוסט ממומן: +${formatMoney(pay)}.`;
      break;
    }
  }
  effects = scaleFame(effects, state.player);
  if (effects.followers) msg += ` +${effects.followers} עוקבים.`;
  const next = applyEffects(state, effects);
  return withToast({ ...next, flags: { ...next.flags, postedThisWeek: true } }, msg);
}

// ------------------------------------------------------------------
// Agent
// ------------------------------------------------------------------

export function signAgent(state: GameState, agentId: string): GameState {
  const agent = getAgent(agentId);
  if (!agent) return state;
  if (!state.flags.agentDiscovered) return withToast(state, 'עוד אף סוכן לא שם לב אליך.');
  if (!agentInterested(agent, state.player)) return withToast(state, `${agent.name} עוד לא משוכנע. כמה משחקים גדולים וזה ישתנה.`);
  let next: GameState = { ...state, player: { ...state.player, agentId } };
  next = addNews(next, [newsNow(next, 'rumors', `${state.player.name} חתם על הסכם ייצוג עם ${agent.name}`)]);
  return withToast(next, `חתמת עם ${agent.name}.`);
}

export function fireAgent(state: GameState): GameState {
  if (!state.player.agentId) return state;
  return withToast({ ...state, player: { ...state.player, agentId: null }, flags: { ...state.flags, transferPush: false } }, 'נפרדת מהסוכן.');
}

export function agentPush(state: GameState): GameState {
  if (!state.player.agentId) return state;
  if (state.flags.transferPush) return withToast(state, 'הסוכן כבר עובד על זה.');
  const agent = getAgent(state.player.agentId)!;
  let next: GameState = { ...state, flags: { ...state.flags, transferPush: true } };
  next = addNews(next, [newsNow(next, 'rumors', `${agent.name} מציע את ${state.player.name} לקבוצות בליגות גבוהות יותר`)]);
  return withToast(next, `${agent.name} מתחיל להפיץ את השם שלך. התוצאות יגיעו בחלון ההעברות.`);
}

// ------------------------------------------------------------------
// Sponsors
// ------------------------------------------------------------------

/** Weekly sponsor payment after the agent's negotiation bonus and commission. */
export function sponsorWeeklyNet(sponsor: Sponsor, agent: Agent | null): number {
  const gross = sponsor.weekly * (1 + (agent?.level ?? 0) * 0.1);
  return Math.round(gross * (1 - (agent?.commission ?? 0)));
}

/** Requirements the player still misses for a sponsor (empty = eligible). */
export function sponsorMissing(player: Player, sponsor: Sponsor): string[] {
  const r = sponsor.requires;
  const missing: string[] = [];
  if (r.form) {
    const form = recentForm(player);
    if (form === null) missing.push(`ממוצע ${r.form.toFixed(1)} ב-5 המשחקים האחרונים (עוד אין מספיק משחקים)`);
    else if (form < r.form) missing.push(`ממוצע ${r.form.toFixed(1)} ב-5 המשחקים האחרונים (כרגע ${form.toFixed(1)})`);
  }
  if (r.motm && player.careerStats.motm < r.motm) missing.push(`${r.motm} משחקים בציון 8+ (יש ${player.careerStats.motm})`);
  if (r.followers && player.followers < r.followers) missing.push(`${r.followers.toLocaleString('he-IL')} עוקבים`);
  if (r.fanRep && player.fanRep < r.fanRep) missing.push(`מוניטין ${r.fanRep}`);
  if (r.division !== undefined && player.division < r.division) missing.push(divisionName(player.sport, r.division));
  if (r.nationalCaps && player.national.caps < r.nationalCaps) missing.push('הופעה בנבחרת');
  return missing;
}

export function sponsorBlocked(player: Player, sponsor: Sponsor): string | null {
  if (player.sponsors.some((s) => s.id === sponsor.id)) return 'פעיל';
  const sameCategory = player.sponsors.map((s) => getSponsor(s.id)).find((s) => s?.category === sponsor.category);
  if (sameCategory) return `יש כבר חסות בקטגוריה (${sameCategory.name})`;
  if (player.sponsors.length >= MAX_SPONSORS) return `מקסימום ${MAX_SPONSORS} ספונסרים`;
  return null;
}

export function signSponsor(state: GameState, id: string): GameState {
  const sponsor = getSponsor(id);
  if (!sponsor) return state;
  const { player } = state;
  const blocked = sponsorBlocked(player, sponsor);
  if (blocked) return withToast(state, blocked);
  if (sponsorMissing(player, sponsor).length > 0) return withToast(state, 'עוד לא עומדים בדרישות של הספונסר.');
  const agent = getAgent(player.agentId);
  const bonus = Math.round(sponsor.signingBonus * (1 - (agent?.commission ?? 0)));
  let next: GameState = {
    ...state,
    player: {
      ...player,
      budget: player.budget + bonus,
      sponsors: [...player.sponsors, { id: sponsor.id, untilSeason: state.season + sponsor.seasons - 1 }],
    },
  };
  next = addNews(next, [newsNow(next, 'fans', `${player.name} הוא הפנים החדשות של ${sponsor.name}`)]);
  return withToast(next, `חוזה חסות עם ${sponsor.name}: +${formatMoney(bonus)} מענק`);
}

export function dropSponsor(state: GameState, id: string): GameState {
  const sponsor = getSponsor(id);
  if (!sponsor) return state;
  const next: GameState = { ...state, player: { ...state.player, sponsors: state.player.sponsors.filter((s) => s.id !== id) } };
  return withToast(applyEffects(next, { fanRep: -1 }), `החוזה עם ${sponsor.name} בוטל.`);
}

export function availableSponsorCount(player: Player): number {
  return SPONSORS.filter((s) => !sponsorBlocked(player, s) && sponsorMissing(player, s).length === 0).length;
}

// ------------------------------------------------------------------
// Life events (decision box)
// ------------------------------------------------------------------

export function getParsedEvent(state: GameState, id: string | null): GameEvent | null {
  const event = getEventById(id);
  if (!event) return null;
  return parseEvent(event, buildContext({ ...state, cast: castOf(state) }));
}

/** Resolves a choice; fame gains are scaled to how known the player is. */
function resolveScaled(choice: Parameters<typeof resolveChoice>[0], player: Player): ReturnType<typeof resolveChoice> {
  const resolution = resolveChoice(choice, player);
  return { ...resolution, outcome: { ...resolution.outcome, effects: scaleFame(resolution.outcome.effects, player) } };
}

function toPending(resolution: ReturnType<typeof resolveChoice>): PendingOutcome {
  return { success: resolution.success, skillCheck: resolution.skillCheck, text: resolution.outcome.text, effects: resolution.outcome.effects };
}

export function chooseLife(state: GameState, index: number): GameState {
  if (state.lifeOutcome) return state;
  const event = getParsedEvent(state, state.pendingLifeEventId);
  const choice = event?.choices[index];
  if (!event || !choice) return state;
  const resolution = resolveScaled(choice, state.player);
  let next = applyEffects(state, resolution.outcome.effects);
  next = markSeen(next, event.id);
  return { ...next, lifeOutcome: toPending(resolution) };
}

export function dismissLife(state: GameState): GameState {
  return { ...state, pendingLifeEventId: null, lifeOutcome: null };
}

// ------------------------------------------------------------------
// Matchday flow
// ------------------------------------------------------------------

/** Conditions (venue, weather, crowd, referee, kickoff) for the next league fixture. */
export function nextFixtureInfo(state: GameState): MatchInfoState {
  const fixture = fixtureFor(state.league, state.matchday);
  const opp = state.league.teams[fixture.opponentIndex]?.name ?? '';
  const home = fixture.home ? state.player.club : opp;
  const away = fixture.home ? opp : state.player.club;
  return matchInfo(state.player.sport, state.player.division, home, away, state.season, state.matchday);
}

/** The free training session that adds the most to this player's rating. */
export function bestTrainingFor(player: Player): TrainingId {
  const weights = OVR_WEIGHTS[player.position];
  let best: TrainingId = 'skills';
  let bestScore = -1;
  for (const o of TRAINING_OPTIONS) {
    if (o.budgetCost > 0) continue;
    const gains = player.position === 'GK' && o.keeperGains ? o.keeperGains : o.gains;
    const score = (Object.keys(gains) as AttrKey[]).reduce((sum, k) => sum + (gains[k] ?? 0) * weights[k], 0);
    if (score > bestScore) {
      bestScore = score;
      best = o.id;
    }
  }
  return best;
}

/**
 * Fills the week's unused time slots with a sensible routine: one shift at the
 * day job if none was worked, then the training that fits the position while
 * there is energy for it, then rest. Returns the new state and a short line per
 * activity.
 */
export function runWeekPlan(state: GameState): { state: GameState; recap: string[] } {
  const recap: string[] = [];
  let next = state;
  for (let guard = 0; next.weekSlots > 0 && guard < 6; guard++) {
    const { player, flags } = next;
    const job = getJob(player.jobId);
    const option = TRAINING_OPTIONS.find((o) => o.id === bestTrainingFor(player)) ?? TRAINING_OPTIONS[1];
    let attempt: GameState;
    if (job && isNonPro(player) && flags.shiftsThisWeek < 1 && player.energy >= job.energyCost) {
      attempt = workShift(next);
    } else if (player.injuryWeeks === 0 && player.energy - option.energyCost >= 30 && player.budget >= option.budgetCost) {
      attempt = train(next, option.id);
    } else {
      attempt = lifestyle(next, 'rest');
    }
    if (attempt.weekSlots === next.weekSlots) break;
    if (attempt.toast) recap.push(attempt.toast);
    next = attempt;
  }
  return { state: { ...next, toast: null }, recap };
}

export function startMatchday(state: GameState): GameState {
  if (state.phase !== 'dashboard') return state;
  const blocker = matchdayBlocker(state);
  if (blocker) return withToast(state, blocker);
  if (state.matchday >= SEASON_MATCHDAYS) return state;
  // Whatever was not done by hand this week happens by the weekly routine.
  const week = runWeekPlan(state);
  state = { ...week.state, weekRecap: week.recap };

  const fixture = fixtureFor(state.league, state.matchday);
  const opponent = state.league.teams[fixture.opponentIndex];
  const role = determineRole(state.player);
  const match = createMatchState(opponent.name, opponent.strength, fixture.home, role, nextFixtureInfo(state));
  let next: GameState = { ...state, currentMatch: match, toast: null };

  // Injured players watch from the stands: straight to the live match.
  if (role === 'injured') return continuePreMatch({ ...next, phase: 'preMatch' });
  const pre = pickEvent('preMatch', next.player, next.seenEvents, { ...matchExtras(next, opponent.name), weather: match.info?.weather, derby: match.info?.derby }, next.flags.usedOnce);
  if (!pre) return continuePreMatch({ ...next, phase: 'preMatch' });
  next = { ...next, phase: 'preMatch', currentMatch: { ...match, preEventId: pre.id } };
  return next;
}

export function choosePreMatch(state: GameState, index: number): GameState {
  const match = state.currentMatch;
  if (!match || match.pendingOutcome) return state;
  const event = getParsedEvent(state, match.preEventId);
  const choice = event?.choices[index];
  if (!event || !choice) return state;
  const resolution = resolveScaled(choice, state.player);
  let next = applyEffects(state, resolution.outcome.effects);
  next = markSeen(next, event.id);
  const updatedMatch = applyMatchEffects(match, resolution.outcome.effects);
  return { ...next, currentMatch: { ...updatedMatch, pendingOutcome: toPending(resolution) } };
}

/** Rosters, strength and naming for the side the player represents in the current match. */
function liveContext(state: GameState) {
  const match = state.currentMatch!;
  const { player } = state;
  const sport = player.sport;
  if (match.national) {
    const top = topDivision(sport);
    return {
      teamName: NATIONAL_TEAM_NAME[match.national],
      teamRoster: rosterFor('ישראל', sport, top),
      oppRoster: rosterFor(match.opponent, sport, top, true),
      clubStrength: NATIONAL_SETUP[sport][match.national].strength,
      division: top,
    };
  }
  if (match.cup !== undefined) {
    const oppDivision = state.cup?.opponentDivision ?? player.division;
    return {
      teamName: player.club,
      teamRoster: rosterFor(player.club, sport, player.division),
      oppRoster: rosterFor(match.opponent, sport, oppDivision),
      clubStrength: playerClubStrength(state),
      division: Math.max(player.division, oppDivision),
    };
  }
  return {
    teamName: player.club,
    teamRoster: rosterFor(player.club, sport, player.division),
    oppRoster: rosterFor(match.opponent, sport, player.division),
    clubStrength: playerClubStrength(state),
    division: player.division,
  };
}

/** Picks the decision moments and kicks off the live match. */
export function continuePreMatch(state: GameState): GameState {
  const match = state.currentMatch;
  if (!match) return state;
  const role = match.role === 'injured' ? 'injured' : determineRole(state.player);
  const count = inGameEventCount(role);
  const sport = state.player.sport;
  const picked = pickInGameEvents(state.player, state.seenEvents, count, {
    weather: match.info?.weather,
    derby: match.info?.derby,
    minMinute: role === 'rotation' ? (sport === 'football' ? 60 : 20) : undefined,
  });
  const planned = planDecisionMinutes(picked, sport, role);
  // Decision moments play out in chronological order.
  const order = picked.map((e, i) => ({ e, m: planned[i] })).sort((a, b) => a.m - b.m);
  const events = order.map((o) => o.e);
  const minutes = order.map((o) => o.m);
  const clutchIdx = events.findIndex((e) => e.clutch);
  const ctx = liveContext(state);
  const prepared: MatchState = {
    ...match,
    role,
    pendingOutcome: null,
    inGameEventIds: events.map((e) => e.id),
    inGameIndex: 0,
    clutch: clutchIdx >= 0,
  };
  const live = kickoff(prepared, {
    player: state.player,
    teamName: ctx.teamName,
    clubStrength: ctx.clubStrength,
    division: ctx.division,
    teamRoster: ctx.teamRoster,
    oppRoster: ctx.oppRoster,
    decisionMinutes: minutes,
    clutchMinute: clutchIdx >= 0 ? minutes[clutchIdx] : null,
  });
  return { ...state, currentMatch: { ...live, clock: 0 }, phase: 'live' };
}

/** Where the live playback stops next: the next decision moment or full time. */
export function nextLiveStop(match: MatchState): { minute: number; decision: boolean } {
  if (match.inGameIndex < match.inGameEventIds.length) return { minute: match.decisionMinutes[match.inGameIndex], decision: true };
  return { minute: match.totalMinutes, decision: false };
}

/** Jumps the live match to its next stop: opens a decision, adds overtime, or ends the match. */
export function advanceLive(state: GameState): GameState {
  const match = state.currentMatch;
  if (!match || state.phase !== 'live') return state;
  const stop = nextLiveStop(match);
  const ctx = liveContext(state);
  if (stop.decision) {
    let next: MatchState = { ...match, clock: stop.minute };
    const event = getEventById(match.inGameEventIds[match.inGameIndex]);
    if (event?.clutch) {
      const prepared = prepareClutch(next, stop.minute, state.player.sport, ctx.teamName, ctx.oppRoster, ctx.teamRoster);
      if (prepared) next = prepared;
      else {
        // Too lopsided for a last-second decider: swap in a regular moment.
        const swap = pickInGameEvents(state.player, [...match.inGameEventIds, ...state.seenEvents], 1, { noClutch: true })[0];
        if (swap) next = { ...next, clutch: false, inGameEventIds: next.inGameEventIds.map((id, i) => (i === match.inGameIndex ? swap.id : id)) };
      }
    }
    return { ...state, currentMatch: next, phase: 'inGame' };
  }
  const atEnd: MatchState = { ...match, clock: match.totalMinutes };
  const ot = overtimeIfTied(atEnd, state.player.sport, ctx.teamName);
  if (ot) return { ...state, currentMatch: ot };
  return finishMatch({ ...state, currentMatch: atEnd });
}

export function chooseInGame(state: GameState, index: number): GameState {
  const match = state.currentMatch;
  if (!match || match.pendingOutcome) return state;
  const eventId = match.inGameEventIds[match.inGameIndex];
  const event = getParsedEvent(state, eventId);
  const choice = event?.choices[index];
  if (!event || !choice) return state;
  const resolution = resolveScaled(choice, state.player);
  let next = applyEffects(state, resolution.outcome.effects);
  next = markSeen(next, event.id);
  const ctx = liveContext(state);
  const minute = match.decisionMinutes[match.inGameIndex] ?? match.clock;
  const entries = decisionEntries(
    minute,
    event,
    resolution.outcome.effects,
    resolution.success,
    resolution.outcome.text,
    state.player.sport,
    state.player.name,
    ctx.teamRoster,
    ctx.oppRoster,
    match.opponent,
  );
  let updated = applyMatchEffects(match, resolution.outcome.effects);
  updated = {
    ...updated,
    timeline: [...updated.timeline, ...entries].sort((a, b) => a.minute - b.minute),
    log: [
      ...updated.log,
      { eventId: event.id, title: event.title, choice: choice.label, success: resolution.success, text: resolution.outcome.text },
    ],
    pendingOutcome: toPending(resolution),
  };
  return { ...next, currentMatch: updated };
}

export function continueInGame(state: GameState): GameState {
  const match = state.currentMatch;
  if (!match) return state;
  return { ...state, phase: 'live', currentMatch: { ...match, inGameIndex: match.inGameIndex + 1, pendingOutcome: null } };
}

/** Simulates the result, updates the league table, stats, economy and news. */
function finishMatch(state: GameState): GameState {
  const match = state.currentMatch;
  if (!match) return state;
  if (match.national) return finishNationalMatch(state);
  if (match.cup !== undefined) return finishCupMatch(state);
  const { player } = state;
  const sport = player.sport;
  const clubIdx = playerClubIndex(state.league);
  const fin = finalizeFromTimeline(match, player);
  const { result } = fin;

  // League table
  const fixture = fixtureFor(state.league, state.matchday);
  let league = fixture.home
    ? applyResult(state.league, sport, clubIdx, fixture.opponentIndex, fin.teamScore, fin.oppScore)
    : applyResult(state.league, sport, fixture.opponentIndex, clubIdx, fin.oppScore, fin.teamScore);
  const others = simulateOtherFixtures(league, sport, state.matchday, state.matchday === SEASON_MATCHDAYS - 1);
  league = others.league;

  // Player stats
  const played = result.rating !== null;
  const s = { ...player.seasonStats };
  const c = { ...player.careerStats };
  if (played) {
    for (const stats of [s, c]) {
      stats.apps += 1;
      if (match.role === 'starter') stats.starts += 1;
      stats.goals += fin.match.playerGoals;
      stats.assists += fin.match.playerAssists;
      stats.points += fin.match.playerPoints;
      stats.rebounds += fin.match.playerRebounds;
      stats.ratingSum += result.rating ?? 0;
      if (result.outcome === 'win') stats.wins += 1;
      else if (result.outcome === 'draw') stats.draws += 1;
      else stats.losses += 1;
      if (result.motm) stats.motm += 1;
    }
  }

  let nextPlayer: Player = { ...player, seasonStats: s, careerStats: c, form: played ? pushForm(player, result.rating!) : player.form };
  const ratingSwing = played ? (result.rating! - 6.5) : 0;
  const energyCost = match.role === 'starter' ? 22 : match.role === 'rotation' ? 12 : 0;
  const winBonus = played && result.outcome === 'win' ? Math.round(player.weeklySalary * 0.25) : 0;
  // People talk about players who perform; how many depends on the league's audience.
  const scored = player.sport === 'football' ? fin.match.playerGoals + fin.match.playerAssists * 0.5 : fin.match.playerPoints / 10;
  const buzz = played ? Math.max(0, result.rating! - 6.2) * 2 + (result.motm ? 2.5 : 0) + scored * 0.8 : 0;
  const audience = MATCH_AUDIENCE[player.sport][player.division] ?? 10;
  const newFollowers = Math.round(audience * buzz * (0.8 + Math.random() * 0.4));
  nextPlayer = applyPlayerEffects(nextPlayer, {
    followers: newFollowers,
    energy: -energyCost,
    coachApproval: played ? Math.round(ratingSwing * 3) : match.role === 'bench' ? -1 : 0,
    confidence: played ? Math.round(ratingSwing * 3) : -1,
    fanRep: result.outcome === 'win' ? 1 : result.outcome === 'loss' ? -1 : 0,
    teamMorale: result.outcome === 'win' ? 4 : result.outcome === 'loss' ? -4 : 0,
    budget: winBonus,
  });

  if (played) nextPlayer = matchExperience(nextPlayer, match.role, result.rating!);
  // A big game is a breakthrough: the key attribute for the position jumps a point.
  const breakthrough = played && result.rating! >= 8 ? breakthroughAttr(nextPlayer) : null;
  if (breakthrough) {
    nextPlayer = { ...nextPlayer, attributes: { ...nextPlayer.attributes, [breakthrough]: nextPlayer.attributes[breakthrough] + 1 } };
  }

  let next: GameState = {
    ...state,
    league,
    player: nextPlayer,
    currentMatch: fin.match,
    phase: 'matchSummary',
  };
  const md = state.matchday + 1;
  if (breakthrough) {
    const label = attrLabels(sport, player.position)[breakthrough];
    next = addNews(next, [makeNews('club', `קפיצת מדרגה: אחרי משחק בציון ${result.rating} ה${label} של ${player.name} עלה ל-${nextPlayer.attributes[breakthrough]}`, state.season, md)]);
  }
  next = addNews(next, [
    ...matchNews(player, match.opponent, result, {
      goals: fin.match.playerGoals,
      assists: fin.match.playerAssists,
      points: fin.match.playerPoints,
      rebounds: fin.match.playerRebounds,
    }, state.season, md),
    ...leagueRoundNews(sport, others.results, state.season, md),
  ]);
  return next;
}

export function continueSummary(state: GameState): GameState {
  const match = state.currentMatch;
  if (!match?.result) return state;
  if (match.national) {
    const post = pickTriggeredEvent('national_post', state.player, state.seenEvents);
    if (!post) return endNationalBreak(state);
    return { ...state, phase: 'postMatch', currentMatch: { ...match, postEventId: post.id, pendingOutcome: null } };
  }
  if (match.cup !== undefined) {
    const outcome = match.result.penalties === 'won' ? 'win' : match.result.penalties === 'lost' ? 'loss' : match.result.outcome;
    const post = match.role === 'injured' ? null : pickEvent('postMatch', state.player, state.seenEvents, { ...matchExtras(state, match.opponent), matchResult: outcome }, state.flags.usedOnce);
    if (!post) return endCupBreak(state);
    return { ...state, phase: 'postMatch', currentMatch: { ...match, postEventId: post.id, pendingOutcome: null } };
  }
  if (match.role === 'injured') return endMatchday(state);
  const post = pickEvent('postMatch', state.player, state.seenEvents, { ...matchExtras(state, match.opponent), matchResult: match.result.outcome }, state.flags.usedOnce);
  if (!post) return endMatchday(state);
  return { ...state, phase: 'postMatch', currentMatch: { ...match, postEventId: post.id, pendingOutcome: null } };
}

export function choosePostMatch(state: GameState, index: number): GameState {
  const match = state.currentMatch;
  if (!match || match.pendingOutcome) return state;
  const event = getParsedEvent(state, match.postEventId);
  const choice = event?.choices[index];
  if (!event || !choice) return state;
  const resolution = resolveScaled(choice, state.player);
  let next = applyEffects(state, resolution.outcome.effects);
  next = markSeen(next, event.id);
  return { ...next, currentMatch: { ...match, pendingOutcome: toPending(resolution) } };
}

export function continuePostMatch(state: GameState): GameState {
  if (state.currentMatch?.national) return endNationalBreak(state);
  if (state.currentMatch?.cup !== undefined) return endCupBreak(state);
  return endMatchday(state);
}

/** Closes the week: economy, job duty, recovery, agent discovery, new life event, windows. */
function endMatchday(state: GameState): GameState {
  const matchday = state.matchday + 1;
  let next: GameState = { ...state, matchday, currentMatch: null };
  let player = { ...next.player };
  const agent = getAgent(player.agentId);

  // Economy: money only comes in here (salary, sponsors). It goes out only when
  // the player spends it or picks a choice that costs money.
  const captainBonus = player.isCaptain ? 1.1 : 1;
  const salaryNet = Math.round(player.weeklySalary * captainBonus * (1 - (agent?.commission ?? 0)));
  player.budget += salaryNet;
  // Driving to training from home tires the player (professionals get housing near the club).
  // A car halves it, a flat near the club removes it.
  const commute = isNonPro(player) ? commuteCost(clubDistance(player.home, player.club)) : commuteCost(null);
  const owned = shopOf(state);
  const commuteEnergy = owned.weekly.includes('apartment') ? 0 : owned.owned.includes('car') ? Math.floor(commute.energy / 2) : commute.energy;

  // Sponsors pay weekly; a sponsor walks away if the fan reputation collapses
  const news: NewsItem[] = [];
  const keptSponsors = player.sponsors.filter((active) => {
    const sponsor = getSponsor(active.id);
    if (!sponsor) return false;
    if (sponsor.requires.fanRep && player.fanRep < sponsor.requires.fanRep - 15) {
      news.push(makeNews('rumors', `${sponsor.name} מפסיקה את החסות של ${player.name} בגלל ירידה בפופולריות`, state.season, matchday));
      return false;
    }
    const form = recentForm(player);
    if (sponsor.requires.form && form !== null && form < sponsor.requires.form - 0.9) {
      news.push(makeNews('rumors', `${sponsor.name} מקפיאה את החסות של ${player.name} אחרי רצף משחקים חלש`, state.season, matchday));
      return false;
    }
    player.budget += sponsorWeeklyNet(sponsor, agent);
    return true;
  });
  player.sponsors = keptSponsors;

  // Weekly services (coaches, flat, physio...)
  const weekly = runWeeklyShop(state, player, news, matchday);
  player = weekly.player;

  // Day job duty
  const flags = { ...next.flags };
  const job = getJob(player.jobId);
  if (job && isNonPro(player)) {
    if (flags.shiftsThisWeek === 0) {
      flags.jobWarnings += 1;
      if (flags.jobWarnings >= 2) {
        news.push(makeNews('rumors', `${player.name} פוטר מהעבודה בתור ${job.name} אחרי שבועיים בלי משמרות`, state.season, matchday));
        player.jobId = null;
        flags.jobWarnings = 0;
        flags.jobRaise = 0;
      } else {
        news.push(makeNews('club', `אזהרה מהבוס: ${player.name} לא הגיע למשמרת השבוע. עוד שבוע כזה והוא בחוץ.`, state.season, matchday));
      }
    }
  }

  // Recovery and drift
  player.energy = clamp(player.energy + 20 - commuteEnergy, 0, 100);
  if (player.injuryWeeks > 0) player.injuryWeeks -= 1;
  player.confidence = Math.round(player.confidence + (50 - player.confidence) * 0.08);
  player.teamMorale = Math.round(player.teamMorale + (55 - player.teamMorale) * 0.08);
  player.coachApproval = Math.round(player.coachApproval + (50 - player.coachApproval) * 0.06);
  player.fanRep = Math.round(player.fanRep + (22 + player.division * 7 - player.fanRep) * 0.06);

  // Captaincy: the armband lifts the dressing room, but the coach can take it back
  if (player.isCaptain) {
    if (player.coachApproval < 35) {
      player.isCaptain = false;
      news.push(makeNews('club', player.sport === 'football' ? `המאמן לקח מ${player.name} את סרט הקפטן אחרי תקופה חלשה` : `${player.name} כבר לא הקפטן: המאמן החליט אחרי תקופה חלשה`, state.season, matchday));
    } else {
      player.teamMorale = clamp(player.teamMorale + 2, 0, 100);
    }
  }

  if (player.budget < -1500) {
    player.confidence = clamp(player.confidence - 3, 0, 100);
    news.push(makeNews('rumors', `${player.name} בחובות. הלחץ הכלכלי מתחיל להשפיע`, state.season, matchday));
  }

  if (!flags.sponsorInterest && player.sponsors.length === 0 && availableSponsorCount(player) > 0) {
    flags.sponsorInterest = true;
    const first = SPONSORS.find((sp) => !sponsorBlocked(player, sp) && sponsorMissing(player, sp).length === 0);
    news.push(makeNews('rumors', `${first?.name ?? 'מותג מקומי'} פונה ל${player.name}: רוצים אותו כפנים של הקמפיין`, state.season, matchday));
  }

  flags.shiftsThisWeek = 0;
  flags.postedThisWeek = false;
  next = { ...next, player, flags, weekSlots: WEEK_SLOTS, weekRecap: undefined, shop: weekly.shop, cast: castOf(state) };

  // Rumors
  const ovr = calcOvr(player);
  const above = player.division < topDivision(player.sport) ? DIVISION_STRENGTH[player.sport][player.division + 1] : null;
  next = addNews(next, [...news, rumorNews(player, ovr, above, state.season, matchday)]);

  // Agent discovery or next life event
  next = queueLifeEvent(next);

  const cupDraw = cupRoundDue(next, matchday);
  if (cupDraw) return { ...next, phase: 'cupDraw', cup: cupDraw };

  if (INTERNATIONAL_WINDOWS.includes(matchday)) {
    const callUp = checkCallUp(next);
    if (callUp) return { ...next, phase: 'callUp', nationalCallUp: callUp };
  }

  if (matchday === TRANSFER_WINDOW_MATCHDAY) {
    const windowState: GameState = { ...next, phase: 'transfer', transferContext: 'midseason' };
    return { ...windowState, transferOffers: generateOffers(windowState) };
  }
  if (matchday >= SEASON_MATCHDAYS) {
    return enterSeasonEnd(next);
  }
  return { ...next, phase: 'dashboard' };
}

/** The coach offers the armband to a trusted, in-form regular (once per season). */
export function captainOfferReady(state: GameState): boolean {
  const { player, flags } = state;
  if (player.isCaptain || flags.captainOfferSeason === state.season) return false;
  const stats = player.seasonStats;
  return (
    stats.apps >= 4 &&
    stats.starts >= 3 &&
    player.coachApproval >= 70 &&
    player.teamMorale >= 50 &&
    averageRating(stats) >= 6.5
  );
}

/** Matchdays after which this season's storyline tells its next chapter. */
const STORY_CHAPTERS = [2, 6, 10];

/**
 * Every season tells its own storyline (a new coach, a rival for your place, a
 * club without money...) in three chapters spread over the season. Storylines
 * are not repeated until all the ones that fit the player were told.
 */
function storyChapter(state: GameState): { flags: GameFlags; eventId: string | null } {
  const { player } = state;
  let flags = state.flags;
  if (!flags.story || flags.story.season !== state.season) {
    const fits = (id: string) => getAllEvents().some((e) => e.trigger === `story_${id}_1` && isEligible(e, player));
    const used = flags.storiesUsed ?? [];
    const fresh = STORY_IDS.filter((id) => !used.includes(id) && fits(id));
    const options = fresh.length > 0 ? fresh : STORY_IDS.filter(fits);
    if (options.length === 0) return { flags, eventId: null };
    const id = options[Math.floor(Math.random() * options.length)];
    flags = { ...flags, story: { id, season: state.season, chapter: 0 }, storiesUsed: fresh.length > 0 ? [...used, id] : [id] };
  }
  const story = flags.story!;
  if (story.chapter >= STORY_CHAPTERS.length || state.matchday < STORY_CHAPTERS[story.chapter]) return { flags, eventId: null };
  // A chapter that no longer fits (e.g. the player left the day job) is skipped.
  const event = pickTriggeredEvent(`story_${story.id}_${story.chapter + 1}`, player, state.seenEvents);
  return { flags: { ...flags, story: { ...story, chapter: story.chapter + 1 } }, eventId: event?.id ?? null };
}

function queueLifeEvent(state: GameState): GameState {
  const { player, flags } = state;
  if (!player.agentId && !flags.agentDiscovered && agentUnlockReady(player)) {
    return {
      ...state,
      pendingLifeEventId: getTriggeredEvent('agent_discovery')?.id ?? null,
      lifeOutcome: null,
      flags: { ...flags, agentDiscovered: true },
    };
  }
  if (player.agentId && player.agentId !== 'agent_michal' && !flags.eliteAgentOffered && agentInterested(getAgent('agent_michal')!, player)) {
    return {
      ...state,
      pendingLifeEventId: getTriggeredEvent('agent_elite')?.id ?? null,
      lifeOutcome: null,
      flags: { ...flags, eliteAgentOffered: true },
    };
  }
  const story = storyChapter(state);
  if (story.eventId) return { ...state, flags: story.flags, pendingLifeEventId: story.eventId, lifeOutcome: null };
  state = { ...state, flags: story.flags };
  if (captainOfferReady(state)) {
    return {
      ...state,
      pendingLifeEventId: pickTriggeredEvent('captain_offer', player, state.seenEvents)?.id ?? null,
      lifeOutcome: null,
      flags: { ...state.flags, captainOfferSeason: state.season },
    };
  }
  // Every week brings one decision; training, work and rest run on their own.
  const event = pickEvent('life', player, state.seenEvents, { matchday: state.matchday }, state.flags.usedOnce);
  if (event) return { ...state, pendingLifeEventId: event.id, lifeOutcome: null };
  return { ...state, pendingLifeEventId: null, lifeOutcome: null };
}

// ------------------------------------------------------------------
// Achievements and retirement
// ------------------------------------------------------------------

/** Unlocks the achievements reached by now, with a news item for each. */
export function unlockAchievements(state: GameState): GameState {
  if (state.phase === 'retired') return state;
  const fresh = newAchievements(state);
  if (fresh.length === 0) return state;
  const unlocked = [...(state.flags.achievements ?? []), ...fresh.map((a) => ({ id: a.id, season: state.season }))];
  const next: GameState = { ...state, flags: { ...state.flags, achievements: unlocked } };
  return addNews(next, fresh.map((a) => newsNow(next, 'club', `הישג חדש: ${a.title}. ${a.description}`)));
}

/** Ends the career. At the season end the season is filed first. */
export function retire(state: GameState): GameState {
  if (state.phase === 'retired') return state;
  if (state.phase === 'seasonEnd') {
    const filed = continueSeasonEnd(state);
    return filed.phase === 'retired' ? filed : endCareer(filed);
  }
  if (state.player.seasonStats.apps === 0) return endCareer(state);
  const record = { season: state.season, club: state.player.club, division: state.player.division, finalPosition: playerClubPosition(state.league), stats: state.player.seasonStats, ovr: calcOvr(state.player) };
  return endCareer({ ...state, player: { ...state.player, history: [...state.player.history, record] } });
}

function endCareer(state: GameState): GameState {
  let next = unlockAchievements(state);
  next = addNews(next, [newsNow(next, 'club', `${next.player.name} תולה את הנעליים בגיל ${next.player.age}. תודה על הכול`)]);
  return { ...next, phase: 'retired', transferOffers: [], transferContext: null, currentMatch: null, retired: { season: next.season, age: next.player.age } };
}

// ------------------------------------------------------------------
// Season end & transfers
// ------------------------------------------------------------------

function enterSeasonEnd(state: GameState): GameState {
  const { player, league } = state;
  const table = sortedTable(league);
  const position = playerClubPosition(league);
  const top = topDivision(player.sport);
  const promoted = position <= 2 && player.division < top;
  const relegated = position >= table.length - 1 && player.division > 0;
  const champion = position === 1;
  return {
    ...state,
    phase: 'seasonEnd',
    seasonSummary: {
      season: state.season,
      finalPosition: position,
      promoted,
      relegated,
      champion,
      stats: player.seasonStats,
      table,
      goals: goalsOf(state).map((g) => ({ label: g.label, done: goalStatus(state, g, position).done })),
    },
  };
}

export function continueSeasonEnd(state: GameState): GameState {
  const summary = state.seasonSummary;
  if (!summary) return state;
  let player = { ...state.player };
  const record = {
    season: summary.season,
    club: player.club,
    division: player.division,
    finalPosition: summary.finalPosition,
    stats: player.seasonStats,
    ovr: calcOvr(player),
  };
  player.history = [...player.history, record];

  const news: NewsItem[] = [];
  const oldDivision = player.division;
  if (summary.promoted) player.division += 1;
  if (summary.relegated) player.division -= 1;
  let flags = state.flags;
  if (summary.champion) {
    news.push(makeNews('league', `${player.club} אלופת ${divisionName(player.sport, oldDivision)}!`, state.season, SEASON_MATCHDAYS));
    player.fanRep = clamp(player.fanRep + 8, 0, 100);
    flags = { ...flags, titles: (flags.titles ?? 0) + 1 };
  }
  // The coach's goals: a bonus and trust for each one met, less trust for each one missed.
  const goals = summary.goals ?? [];
  if (goals.length > 0) {
    const met = goals.filter((g) => g.done).length;
    const bonus = met * Math.max(500, player.weeklySalary * 2);
    player.coachApproval = clamp(player.coachApproval + met * 6 - (goals.length - met) * 4, 0, 100);
    player.confidence = clamp(player.confidence + met * 3, 0, 100);
    player.budget += bonus;
    news.push(
      makeNews(
        'club',
        met === goals.length
          ? `המאמן מרוצה: ${player.name} עמד בכל ${goals.length} היעדים של העונה. בונוס של ${formatMoney(bonus)}`
          : met === 0
            ? `${player.name} לא עמד באף יעד שהמאמן הציב העונה`
            : `${player.name} עמד ב-${met} מתוך ${goals.length} יעדי העונה${bonus ? ` ומקבל בונוס של ${formatMoney(bonus)}` : ''}`,
        state.season,
        SEASON_MATCHDAYS,
      ),
    );
  }
  if (summary.promoted) {
    news.push(makeNews('club', `${player.club} עולה ל${divisionName(player.sport, player.division)}!`, state.season, SEASON_MATCHDAYS));
    // A promoted club upgrades the player's contract to the new level.
    const newContract = contractForDivision(player.sport, player.division);
    if (newContract !== player.contract) {
      player.contract = newContract;
      player.weeklySalary = Math.max(player.weeklySalary, baseSalary(player.sport, player.division));
      news.push(makeNews('club', `${player.name} קיבל ${CONTRACT_LABEL[newContract]} לאחר העלייה`, state.season, SEASON_MATCHDAYS));
    }
  }
  if (summary.relegated) {
    news.push(makeNews('club', `${player.club} יורדת ל${divisionName(player.sport, player.division)}`, state.season, SEASON_MATCHDAYS));
  }
  player = autoQuitJobIfPro(player, news, state.season);

  let next: GameState = { ...state, player, flags };
  next = addNews(next, news);
  // The body decides when the career ends.
  if (player.age >= LAST_SEASON_AGE) return endCareer(next);
  const windowState: GameState = { ...next, phase: 'transfer', transferContext: 'endseason' };
  return { ...windowState, transferOffers: generateOffers(windowState) };
}

function autoQuitJobIfPro(player: Player, news: NewsItem[], season: number): Player {
  if (player.jobId && player.contract === 'pro' && isProDivision(player.sport, player.division)) {
    const job = getJob(player.jobId);
    news.push(makeNews('club', `${player.name} עוזב את העבודה בתור ${job?.name ?? 'עובד'}: מעכשיו ${player.name} שחקן מקצוען במשרה מלאה`, season, SEASON_MATCHDAYS));
    return { ...player, jobId: null };
  }
  return player;
}

export function acceptOffer(state: GameState, offerId: string): GameState {
  const offer = state.transferOffers.find((o) => o.id === offerId);
  if (!offer) return state;
  const agent = getAgent(state.player.agentId);
  const bonusNet = Math.round(offer.signingBonus * (1 - (agent?.commission ?? 0)));
  const news: NewsItem[] = [];
  let player: Player = {
    ...state.player,
    club: offer.club,
    division: offer.division,
    contract: offer.contract,
    weeklySalary: offer.weeklySalary,
    budget: state.player.budget + bonusNet,
    coachApproval: offer.role === 'starter' ? 62 : 48,
    teamMorale: 55,
    isCaptain: false,
  };
  news.push(
    makeNews(
      'club',
      `רשמי: ${player.name} חתם ב${offer.club} (${divisionName(player.sport, offer.division)}) על ${CONTRACT_LABEL[offer.contract]}`,
      state.season,
      state.matchday,
    ),
  );
  news.push(makeNews('fans', `אוהדי ${offer.club} מקבלים את ${player.name} בחום ברשתות`, state.season, state.matchday));
  player = autoQuitJobIfPro(player, news, state.season);

  let next: GameState = {
    ...state,
    player,
    transferOffers: [],
    flags: { ...state.flags, transferPush: false },
  };
  next = addNews(next, news);

  if (state.transferContext === 'midseason') {
    const league = createLeague(player.sport, player.division, player.club, offer.strength, state.matchday);
    return keepRivalClose({ ...next, league, phase: 'dashboard', transferContext: null });
  }
  return startNewSeason({ ...next, transferContext: null });
}

export function declineOffers(state: GameState): GameState {
  const next: GameState = { ...state, transferOffers: [], flags: { ...state.flags, transferPush: false } };
  if (state.transferContext === 'midseason') return { ...next, phase: 'dashboard', transferContext: null };
  return startNewSeason({ ...next, transferContext: null });
}

function startNewSeason(state: GameState): GameState {
  const season = state.season + 1;
  const expired = state.player.sponsors.filter((s) => s.untilSeason < season).map((s) => getSponsor(s.id)?.name).filter(Boolean);
  const age = state.player.age + 1;
  // From 31 the body slowly gives way: pace first, then the rest.
  const attributes = { ...state.player.attributes };
  if (age >= 31) attributes.physical = Math.max(20, attributes.physical - randInt(1, 3));
  if (age >= 33) {
    attributes.attack = Math.max(20, attributes.attack - randInt(0, 2));
    attributes.technique = Math.max(20, attributes.technique - randInt(0, 1));
  }
  const player: Player = {
    ...state.player,
    attributes,
    sponsors: state.player.sponsors.filter((s) => s.untilSeason >= season),
    age,
    seasonStats: emptyStats(),
    coachApproval: Math.round(state.player.coachApproval + (52 - state.player.coachApproval) * 0.5),
    energy: 100,
    injuryWeeks: 0,
  };
  const clubStrength = DIVISION_STRENGTH[player.sport][player.division] + randInt(-3, 3);
  const league = createLeague(player.sport, player.division, player.club, clubStrength);
  let next: GameState = {
    ...state,
    season,
    matchday: 0,
    player,
    league,
    phase: 'dashboard',
    seasonSummary: null,
    weekSlots: WEEK_SLOTS,
    flags: { ...state.flags, shiftsThisWeek: 0, postedThisWeek: false, jobWarnings: 0 },
  };
  next = keepRivalClose(next);
  next = { ...next, goals: { season, items: seasonGoalsFor(next) } };
  next = addNews(next, [
    makeNews('league', `עונה ${season} יוצאת לדרך ב${divisionName(player.sport, player.division)}`, season, 0),
    makeNews('club', `${player.club} פותחת את ההכנות לעונה. ${player.name} כבר באימונים.`, season, 0),
    expired.length ? makeNews('rumors', `הסתיימו חוזי החסות של ${player.name} עם ${expired.join(', ')}`, season, 0) : null,
  ]);
  return next;
}

// ------------------------------------------------------------------
// State Cup
// ------------------------------------------------------------------

export function cupOf(state: GameState): CupState {
  return state.cup && state.cup.season === state.season ? state.cup : { season: state.season, round: 0, out: false, results: [] };
}

/** Draws the next cup opponent when a round is played after this matchday. */
function cupRoundDue(state: GameState, matchday: number): CupState | null {
  const cup = cupOf(state);
  if (cup.out || cup.round >= CUP_ROUNDS.length || CUP_ROUNDS[cup.round].afterMatchday !== matchday) return null;
  const { player } = state;
  const division = Math.min(topDivision(player.sport), player.division + CUP_ROUNDS[cup.round].up);
  const met = new Set(cup.results.map((r) => r.opponent));
  const clubs = CLUB_POOLS[player.sport][division] ?? [];
  const pool = clubs.filter((name) => name !== player.club && !met.has(name));
  return {
    ...cup,
    opponent: pickRandom(pool.length > 0 ? pool : clubs),
    opponentDivision: division,
    opponentStrength: DIVISION_STRENGTH[player.sport][division] + randInt(-3, 3),
    // The club from the lower league hosts.
    home: division > player.division ? true : Math.random() < 0.5,
  };
}

export function startCupMatch(state: GameState): GameState {
  const cup = state.cup;
  if (state.phase !== 'cupDraw' || !cup?.opponent) return state;
  const { player } = state;
  const home = cup.home ? player.club : cup.opponent;
  const away = cup.home ? cup.opponent : player.club;
  const info = matchInfo(player.sport, Math.max(player.division, cup.opponentDivision ?? player.division), home, away, state.season, 100 + cup.round);
  const role = determineRole(player);
  const match = { ...createMatchState(cup.opponent, cup.opponentStrength ?? 50, Boolean(cup.home), role, { ...info, derby: false }), cup: cup.round };
  const next: GameState = { ...state, currentMatch: match, toast: null };
  if (role === 'injured') return continuePreMatch({ ...next, phase: 'preMatch' });
  const pre = pickEvent('preMatch', player, state.seenEvents, { ...matchExtras(next, cup.opponent), weather: info.weather }, state.flags.usedOnce);
  if (!pre) return continuePreMatch({ ...next, phase: 'preMatch' });
  return { ...next, phase: 'preMatch', currentMatch: { ...match, preEventId: pre.id } };
}

function finishCupMatch(state: GameState): GameState {
  const match = state.currentMatch!;
  const cup = cupOf(state);
  const roundIndex = match.cup!;
  const round = CUP_ROUNDS[roundIndex];
  const { player } = state;
  const fin = finalizeFromTimeline(match, player);
  let result = fin.result;
  // Football cup draws go to penalties; the stronger side has a small edge.
  if (result.outcome === 'draw') {
    const edge = clamp((playerClubStrength(state) - match.opponentStrength) / 100, -0.15, 0.15) + (player.position === 'GK' && result.rating !== null ? 0.05 : 0);
    result = { ...result, penalties: Math.random() < 0.5 + edge ? 'won' : 'lost' };
  }
  const advanced = result.outcome === 'win' || result.penalties === 'won';
  const played = result.rating !== null;
  const c = { ...player.careerStats };
  if (played) {
    c.apps += 1;
    if (match.role === 'starter') c.starts += 1;
    c.goals += fin.match.playerGoals;
    c.assists += fin.match.playerAssists;
    c.points += fin.match.playerPoints;
    c.rebounds += fin.match.playerRebounds;
    c.ratingSum += result.rating ?? 0;
    if (result.outcome === 'win') c.wins += 1;
    else if (result.outcome === 'draw') c.draws += 1;
    else c.losses += 1;
    if (result.motm) c.motm += 1;
  }
  const upset = advanced && (cup.opponentDivision ?? 0) > player.division;
  const final = roundIndex === CUP_ROUNDS.length - 1;
  const prize = advanced ? Math.round(round.prize * (1 + player.division * 0.5)) : 0;
  let nextPlayer = applyPlayerEffects(
    { ...player, careerStats: c, form: played ? pushForm(player, result.rating!) : player.form },
    {
      energy: match.role === 'starter' ? -18 : match.role === 'rotation' ? -10 : 0,
      confidence: (played ? Math.round((result.rating! - 6.5) * 3) : 0) + (advanced ? 2 : -2),
      fanRep: advanced ? (final ? 10 : upset ? 5 : 2) : -1,
      followers: final && advanced ? 800 : upset ? 250 : advanced ? 60 : 0,
      teamMorale: advanced ? 5 : -4,
      budget: prize,
    },
  );
  if (played) nextPlayer = matchExperience(nextPlayer, match.role, result.rating!);
  const sep = player.sport === 'basketball' ? ':' : '-';
  const score = `${result.teamScore}${sep}${result.oppScore}`;
  const pens = result.penalties ? ` (${result.penalties === 'won' ? 'ניצחון' : 'הפסד'} בפנדלים)` : '';
  const nextCup: CupState = {
    ...cup,
    round: roundIndex + 1,
    out: !advanced,
    opponent: undefined,
    results: [...cup.results, { round: roundIndex, opponent: match.opponent, score, advanced, penalties: Boolean(result.penalties) }],
  };
  const flags = advanced && final ? { ...state.flags, cupWins: (state.flags.cupWins ?? 0) + 1 } : state.flags;
  let next: GameState = { ...state, player: nextPlayer, currentMatch: { ...fin.match, result }, phase: 'matchSummary', cup: nextCup, flags };
  const club = player.club;
  const headline = !advanced
    ? `${club} הודחה מ${CUP_NAME} ב${round.name}: ${score} מול ${match.opponent}${pens}`
    : final
      ? `${club} זוכה ב${CUP_NAME}! ${score} על ${match.opponent} בגמר${pens}`
      : upset
        ? `הפתעה ב${CUP_NAME}: ${club} מדיחה את ${match.opponent} מליגה גבוהה, ${score}${pens}`
        : `${club} עולה ל${CUP_ROUNDS[roundIndex + 1].name} של ${CUP_NAME} אחרי ${score} על ${match.opponent}${pens}`;
  next = addNews(next, [
    newsNow(next, 'club', `${headline}.${played ? ` ${player.name} קיבל ציון ${result.rating!.toFixed(1)}.` : ''}`),
    advanced && final ? newsNow(next, 'fans', `חגיגות בעיר: ${player.name} והחברים מניפים את ${CUP_NAME}`) : null,
    prize > 0 ? newsNow(next, 'club', `${club} מחלקת לשחקנים מענק עלייה בגביע: ${formatMoney(prize)} לכל אחד`) : null,
  ]);
  return next;
}

function endCupBreak(state: GameState): GameState {
  return { ...state, phase: 'dashboard', currentMatch: null };
}

// ------------------------------------------------------------------
// National team
// ------------------------------------------------------------------

/** Decides whether the player is called up during an international break. */
export function checkCallUp(state: GameState): NationalCallUp | null {
  const { player } = state;
  if (player.injuryWeeks > 0) return null;
  const ovr = calcOvr(player);
  const form = player.seasonStats.apps >= 3 ? averageRating(player.seasonStats) : 0;
  const setup = NATIONAL_SETUP[player.sport];
  let level: NationalLevel | null = null;
  if (ovr >= setup.senior.minOvr && (form >= setup.senior.minForm || ovr >= setup.senior.minOvr + 6)) level = 'senior';
  else if (player.age <= (setup.u21.maxAge ?? 21) && ovr >= setup.u21.minOvr && form >= setup.u21.minForm) level = 'u21';
  if (!level || Math.random() > 0.85) return null;
  const opponent = pickRandom(NATIONAL_OPPONENTS[player.sport]);
  return {
    level,
    opponent: opponent.name,
    opponentStrength: opponent.strength - (level === 'u21' ? 12 : 0),
    home: Math.random() < 0.5,
  };
}

export function acceptCallUp(state: GameState): GameState {
  const callUp = state.nationalCallUp;
  if (!callUp) return state;
  const { player } = state;
  const strength = NATIONAL_SETUP[player.sport][callUp.level].strength;
  const role = calcOvr(player) >= strength - 2 && player.energy >= 25 ? 'starter' : 'rotation';
  const venue =
    player.sport === 'football'
      ? callUp.home
        ? pickRandom(['אצטדיון סמי עופר', 'אצטדיון טדי', 'אצטדיון בלומפילד'])
        : `האצטדיון הלאומי של ${callUp.opponent}`
      : callUp.home
        ? pickRandom(['היכל מנורה מבטחים', 'ארנה ירושלים'])
        : `הארנה הלאומית של ${callUp.opponent}`;
  const info: MatchInfoState = {
    venue,
    city: callUp.home ? 'ישראל' : callUp.opponent,
    attendance: callUp.level === 'senior' ? randInt(14000, 30000) : randInt(2500, 7000),
    weather: player.sport === 'football' ? 'clear' : 'hall_loud',
    weatherLabel: player.sport === 'football' ? `ערב נעים, ${randInt(16, 24)} מעלות` : 'ארנה מלאה',
    temperature: 20,
    referee: pickRandom(['קלמנט טורפן', 'דניאל זיברט', 'יואל מורנו', 'אנטוניו מאטאו']),
    kickoff: 'ערב נבחרות 21:45',
    derby: false,
  };
  const match = { ...createMatchState(callUp.opponent, callUp.opponentStrength, callUp.home, role, info), national: callUp.level };
  let next: GameState = addNews(
    { ...state, currentMatch: match, toast: null },
    [newsNow(state, 'club', `${player.name} זומן ל${NATIONAL_TEAM_NAME[callUp.level]} לקראת המשחק מול ${callUp.opponent}`)],
  );
  const pre = pickTriggeredEvent('national_pre', player, state.seenEvents);
  if (!pre) return continuePreMatch({ ...next, phase: 'preMatch' });
  next = { ...next, phase: 'preMatch', currentMatch: { ...match, preEventId: pre.id } };
  return next;
}

export function declineCallUp(state: GameState): GameState {
  const callUp = state.nationalCallUp;
  if (!callUp) return state;
  let next = applyEffects(state, { fanRep: -4, energy: 10, coachApproval: 2 });
  next = addNews(next, [newsNow(next, 'fans', `${state.player.name} ביקש לוותר על הזימון ל${NATIONAL_TEAM_NAME[callUp.level]}. האוהדים מאוכזבים.`)]);
  return { ...next, phase: 'dashboard', nationalCallUp: null };
}

function finishNationalMatch(state: GameState): GameState {
  const match = state.currentMatch!;
  const level = match.national!;
  const { player } = state;
  const sport = player.sport;
  const fin = finalizeFromTimeline(match, player);
  const { result } = fin;
  const played = result.rating !== null;
  const national = { ...player.national };
  if (played) {
    if (level === 'senior') national.caps += 1;
    else national.u21Caps += 1;
    national.goals += fin.match.playerGoals;
    national.assists += fin.match.playerAssists;
    national.points += fin.match.playerPoints;
    national.ratingSum += result.rating ?? 0;
  }
  const swing = played ? result.rating! - 6.5 : 0;
  const levelBoost = level === 'senior' ? 2 : 1;
  const nextPlayer = applyPlayerEffects(
    { ...player, national, form: played ? pushForm(player, result.rating!) : player.form },
    {
      energy: match.role === 'starter' ? -18 : -10,
      confidence: Math.round(4 + swing * 3),
      fanRep: (result.outcome === 'win' ? 4 : result.outcome === 'draw' ? 2 : 1) * levelBoost,
      followers: Math.round((150 + Math.max(0, swing) * 120) * levelBoost),
      coachApproval: 3,
    },
  );
  const teamName = NATIONAL_TEAM_NAME[level];
  if (played) Object.assign(nextPlayer, matchExperience(nextPlayer, match.role, result.rating!));
  const score = sport === 'basketball' ? `${result.teamScore}:${result.oppScore}` : `${result.teamScore}-${result.oppScore}`;
  const verb = result.outcome === 'win' ? 'ניצחה את' : result.outcome === 'loss' ? 'הפסידה ל' : 'סיימה בתיקו מול';
  const joiner = result.outcome === 'loss' ? '' : ' ';
  let next: GameState = { ...state, player: nextPlayer, currentMatch: fin.match, phase: 'matchSummary' };
  next = addNews(next, [
    newsNow(next, 'club', `${teamName} ${verb}${joiner}${match.opponent} ${score}. ${player.name} ${played ? `קיבל ציון ${result.rating!.toFixed(1)}` : 'לא נכנס למגרש'}.`),
    result.motm ? newsNow(next, 'fans', `כל המדינה מדברת על ${player.name} אחרי ההופעה במדי הנבחרת`) : null,
  ]);
  return next;
}

function endNationalBreak(state: GameState): GameState {
  return { ...state, phase: 'dashboard', currentMatch: null, nationalCallUp: null };
}
