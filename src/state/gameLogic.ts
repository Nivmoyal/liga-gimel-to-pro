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
  ATTR_LABEL,
  CONTRACT_LABEL,
  DIVISION_STRENGTH,
  LIVING_COST,
  OVR_WEIGHTS,
  SEASON_MATCHDAYS,
  TRANSFER_WINDOW_MATCHDAY,
  WEEK_SLOTS,
  divisionName,
  isProDivision,
  topDivision,
} from '../data/sports';
import { LIFESTYLE_OPTIONS, SOCIAL_POSTS, TRAINING_OPTIONS } from '../data/activities';
import type { LifestyleId, SocialPostId, TrainingId } from '../data/activities';
import {
  buildContext,
  getEventById,
  getTriggeredEvent,
  parseEvent,
  pickTriggeredEvent,
  pickEvent,
  pickInGameEvents,
  resolveChoice,
} from '../services/eventEngine';
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

export const SAVE_VERSION = 6;
const MAX_NEWS = 60;
/** New followers per point of "buzz" after a good match, by division. */
const MATCH_AUDIENCE: Record<SportType, number[]> = {
  football: [5, 12, 35, 90, 240],
  basketball: [6, 15, 60, 200],
};
const SEEN_MEMORY = 40;

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

function markSeen(state: GameState, id: string): GameState {
  return { ...state, seenEvents: [id, ...state.seenEvents.filter((s) => s !== id)].slice(0, SEEN_MEMORY) };
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
  if (effects.setCaptain && !state.player.isCaptain) {
    next = addNews(next, [
      newsNow(next, 'club', `רשמי: ${next.player.name} נבחר לקפטן של ${next.player.club}`),
      newsNow(next, 'fans', `סרט הקפטן על הזרוע של ${next.player.name}. האוהדים מתרגשים`),
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

function emptyNational() {
  return { caps: 0, u21Caps: 0, goals: 0, assists: 0, points: 0, ratingSum: 0 };
}

function emptyProgress(): Attributes {
  return { attack: 0, technique: 0, playmaking: 0, defense: 0, physical: 0, mental: 0 };
}

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
  if (raw.version < 1 || raw.version > 5) return null;
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
    striker: 'החלוץ',
    midfielder: 'הקשר',
    centerBack: 'הבלם',
    fullBack: 'המגן',
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
  let gains = option.gains;
  if (Object.keys(gains).length === 0) {
    const weights = OVR_WEIGHTS[player.position];
    const top = [...ATTR_KEYS].sort((a, b) => weights[b] - weights[a]).slice(0, 2);
    gains = { [top[0]]: 0.45, [top[1]]: 0.35 };
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
  const labels = ATTR_LABEL[after.sport];
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
  if (option.oneTime && state.flags.ownsBoots) return withToast(state, 'כבר קנית את הציוד הזה.');
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
  if (option.oneTime) next = { ...next, flags: { ...next.flags, ownsBoots: true } };
  if (option.progress) {
    const gains: Partial<Attributes> = {};
    for (const key of Object.keys(option.progress) as AttrKey[]) gains[key] = trainingProgress(next.player, key, option.progress[key]!);
    const { player, raised } = addProgress(next.player, gains);
    next = { ...next, player };
    if (raised.length > 0) return withToast(next, `${option.label}: ${ATTR_LABEL[player.sport][raised[0]]} עלה ל-${player.attributes[raised[0]]}.`);
  }
  return withToast(next, `${option.label}: בוצע.`);
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
  return parseEvent(event, buildContext(state));
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

export function startMatchday(state: GameState): GameState {
  if (state.phase !== 'dashboard') return state;
  const blocker = matchdayBlocker(state);
  if (blocker) return withToast(state, blocker);
  if (state.matchday >= SEASON_MATCHDAYS) return state;

  const fixture = fixtureFor(state.league, state.matchday);
  const opponent = state.league.teams[fixture.opponentIndex];
  const role = determineRole(state.player);
  const match = createMatchState(opponent.name, opponent.strength, fixture.home, role, nextFixtureInfo(state));
  let next: GameState = { ...state, currentMatch: match, toast: null };

  // Injured players watch from the stands: straight to the live match.
  if (role === 'injured') return continuePreMatch({ ...next, phase: 'preMatch' });
  const pre = pickEvent('preMatch', next.player, next.seenEvents, { matchday: next.matchday, weather: match.info?.weather, derby: match.info?.derby });
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
        const swap = pickInGameEvents(state.player, [...state.seenEvents, ...match.inGameEventIds], 1, { noClutch: true })[0];
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

  let next: GameState = {
    ...state,
    league,
    player: nextPlayer,
    currentMatch: fin.match,
    phase: 'matchSummary',
  };
  const md = state.matchday + 1;
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
  if (match.role === 'injured') return endMatchday(state);
  const post = pickEvent('postMatch', state.player, state.seenEvents, { matchResult: match.result.outcome, matchday: state.matchday });
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
  return endMatchday(state);
}

/** Closes the week: economy, job duty, recovery, agent discovery, new life event, windows. */
function endMatchday(state: GameState): GameState {
  const matchday = state.matchday + 1;
  let next: GameState = { ...state, matchday, currentMatch: null };
  let player = { ...next.player };
  const agent = getAgent(player.agentId);

  // Economy
  const captainBonus = player.isCaptain ? 1.1 : 1;
  const salaryNet = Math.round(player.weeklySalary * captainBonus * (1 - (agent?.commission ?? 0)));
  const living = LIVING_COST[player.contract];
  player.budget += salaryNet - living;
  // Driving to training from home (professionals get housing near the club)
  const commute = isNonPro(player) ? commuteCost(clubDistance(player.home, player.club)) : commuteCost(null);
  player.budget -= commute.budget;

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
  player.energy = clamp(player.energy + 20 - commute.energy, 0, 100);
  if (player.injuryWeeks > 0) player.injuryWeeks -= 1;
  player.confidence = Math.round(player.confidence + (50 - player.confidence) * 0.08);
  player.teamMorale = Math.round(player.teamMorale + (55 - player.teamMorale) * 0.08);
  player.coachApproval = Math.round(player.coachApproval + (50 - player.coachApproval) * 0.06);
  player.fanRep = Math.round(player.fanRep + (22 + player.division * 7 - player.fanRep) * 0.06);

  // Captaincy: the armband lifts the dressing room, but the coach can take it back
  if (player.isCaptain) {
    if (player.coachApproval < 35) {
      player.isCaptain = false;
      news.push(makeNews('club', `המאמן לקח מ${player.name} את סרט הקפטן אחרי תקופה חלשה`, state.season, matchday));
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
  next = { ...next, player, flags, weekSlots: WEEK_SLOTS };

  // Rumors
  const ovr = calcOvr(player);
  const above = player.division < topDivision(player.sport) ? DIVISION_STRENGTH[player.sport][player.division + 1] : null;
  next = addNews(next, [...news, rumorNews(player, ovr, above, state.season, matchday)]);

  // Agent discovery or next life event
  next = queueLifeEvent(next);

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
  if (captainOfferReady(state)) {
    return {
      ...state,
      pendingLifeEventId: getTriggeredEvent('captain_offer')?.id ?? null,
      lifeOutcome: null,
      flags: { ...flags, captainOfferSeason: state.season },
    };
  }
  if (Math.random() < 0.65) {
    const event = pickEvent('life', player, state.seenEvents, { matchday: state.matchday });
    if (event) return { ...state, pendingLifeEventId: event.id, lifeOutcome: null };
  }
  return { ...state, pendingLifeEventId: null, lifeOutcome: null };
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
  if (summary.champion) {
    news.push(makeNews('league', `${player.club} אלופת ${divisionName(player.sport, oldDivision)}!`, state.season, SEASON_MATCHDAYS));
    player.fanRep = clamp(player.fanRep + 8, 0, 100);
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

  let next: GameState = { ...state, player };
  next = addNews(next, news);
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
    return { ...next, league, phase: 'dashboard', transferContext: null };
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
  const player: Player = {
    ...state.player,
    sponsors: state.player.sponsors.filter((s) => s.untilSeason >= season),
    age: state.player.age + 1,
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
  next = addNews(next, [
    makeNews('league', `עונה ${season} יוצאת לדרך ב${divisionName(player.sport, player.division)}`, season, 0),
    makeNews('club', `${player.club} פותחת את ההכנות לעונה. ${player.name} כבר באימונים.`, season, 0),
    expired.length ? makeNews('rumors', `הסתיימו חוזי החסות של ${player.name} עם ${expired.join(', ')}`, season, 0) : null,
  ]);
  return next;
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
