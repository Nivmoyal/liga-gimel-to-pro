// ===================================================================
// Core domain types for the dual-sport career game
// ===================================================================

export type SportType = 'football' | 'basketball';

export type NationalLevel = 'u21' | 'senior';

export type FootballPosition =
  | 'GK'
  | 'LB'
  | 'CB'
  | 'RB'
  | 'LWB'
  | 'RWB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LW'
  | 'RW'
  | 'ST';
export type BasketballPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type Position = FootballPosition | BasketballPosition;

/** Where the player lives (typed by the player, matched to a known town). */
export interface HomePlace {
  name: string;
  lat: number;
  lon: number;
}

/** Generic attribute keys. Labels change per sport (see data/sports.ts). */
export type AttrKey = 'attack' | 'technique' | 'playmaking' | 'defense' | 'physical' | 'mental';
export type Attributes = Record<AttrKey, number>;

export type ContractType = 'amateur' | 'semi' | 'pro';

export type JobId = 'pizza' | 'security' | 'factory' | 'mechanic' | 'instructor';

export interface Job {
  id: JobId;
  name: string;
  description: string;
  payPerShift: number;
  energyCost: number;
  /** Small attribute or reputation perk granted on each shift. */
  perk: { label: string; effects: Effects };
}

export interface Agent {
  id: string;
  name: string;
  agency: string;
  level: 1 | 2 | 3;
  commission: number;
  description: string;
  /** What the agent needs to see before calling: recent form and level. */
  interest: { form: number; division?: number; motm?: number; nationalCaps?: number };
}

// ------------------------------------------------------------------
// Effects / events
// ------------------------------------------------------------------

export type NewsCategory = 'club' | 'rumors' | 'league' | 'fans';

export interface Effects {
  budget?: number;
  energy?: number;
  coachApproval?: number;
  fanRep?: number;
  teamMorale?: number;
  confidence?: number;
  followers?: number;
  attributes?: Partial<Attributes>;
  injuryWeeks?: number;
  setAgent?: string | null;
  setCaptain?: boolean;
  // Match-only effects
  rating?: number;
  playerGoals?: number;
  playerAssists?: number;
  playerPoints?: number;
  playerRebounds?: number;
  teamScore?: number;
  oppScore?: number;
  news?: { category: NewsCategory; text: string };
}

export interface ChoiceOutcome {
  text: string;
  effects: Effects;
}

export interface EventChoice {
  label: string;
  /** When set, the choice is a skill check against this attribute. */
  stat?: AttrKey;
  /** Difficulty of the skill check (roughly the attribute value needed for a 50% roll). */
  difficulty?: number;
  success: ChoiceOutcome;
  fail?: ChoiceOutcome;
}

export type EventType = 'preMatch' | 'inGame' | 'postMatch' | 'life';
export type EventSport = SportType | 'both';

export interface EventConditions {
  minDivision?: number;
  maxDivision?: number;
  requiresJob?: boolean;
  requiresAgent?: boolean;
  requiresCaptain?: boolean;
  contract?: ContractType[];
  minOvr?: number;
  positions?: Position[];
  matchResult?: Array<'win' | 'draw' | 'loss'>;
  minMatchday?: number;
  /** Only on match days with this weather / hall condition. */
  weather?: string[];
  /** Only in derbies. */
  derby?: boolean;
  /**
   * League level shared by both sports: 0 = ליגה ג׳ (football only),
   * 1 = ליגה ב׳, 2 = ליגה א׳, 3 = לאומית, 4 = ליגת העל.
   */
  minLevel?: number;
  maxLevel?: number;
  /** Career appearances needed (nobody asks a debutant about transfers). */
  minApps?: number;
  /** Season of the career (1 = first season). */
  minSeason?: number;
  minFollowers?: number;
  /** Happens at most once in a career. */
  once?: boolean;
  /** Only while the club is in these table places: top = promotion places, bottom = relegation places. */
  standing?: Array<'top' | 'mid' | 'bottom'>;
  /** Only against a club the player used to play for. */
  formerClub?: boolean;
}

export interface GameEvent {
  id: string;
  type: EventType;
  sport: EventSport;
  speaker: string;
  title: string;
  text: string;
  tip?: string;
  /** Minute / time label for in-game scenarios. */
  clock?: string;
  /** Photo key for the event (see src/data/photos.ts). */
  scene?: string;
  /** Clutch scenarios make the match close so the decision decides the result. */
  clutch?: boolean;
  /** Special events are never picked at random, only by an explicit trigger. */
  trigger?: string;
  weight?: number;
  conditions?: EventConditions;
  choices: EventChoice[];
}

export interface EventContext {
  playerName: string;
  club: string;
  opponent: string;
  job: string;
  agent: string;
  sport: SportType;
  /** Live score phrase for {תוצאה} during a match. */
  scoreLine?: string;
  referee?: string;
  venue?: string;
}

// ------------------------------------------------------------------
// Player, league, match
// ------------------------------------------------------------------

export interface SeasonStats {
  apps: number;
  starts: number;
  goals: number;
  assists: number;
  points: number;
  rebounds: number;
  ratingSum: number;
  wins: number;
  draws: number;
  losses: number;
  motm: number;
}

export interface SeasonRecord {
  season: number;
  club: string;
  division: number;
  finalPosition: number;
  stats: SeasonStats;
  ovr: number;
}

export interface ActiveSponsor {
  id: string;
  /** Last season (inclusive) the deal is active. */
  untilSeason: number;
}

export interface NationalStats {
  caps: number;
  u21Caps: number;
  goals: number;
  assists: number;
  points: number;
  ratingSum: number;
}

export interface Player {
  name: string;
  shirtNumber: number;
  /** Captain of the current club (lost on transfer or when the coach loses faith). */
  isCaptain: boolean;
  sport: SportType;
  position: Position;
  home: HomePlace;
  club: string;
  division: number;
  contract: ContractType;
  weeklySalary: number;
  attributes: Attributes;
  /** Fractional progress (0..1) towards the next whole point of each attribute. */
  progress: Attributes;
  potential: number;
  age: number;
  budget: number;
  energy: number;
  coachApproval: number;
  fanRep: number;
  teamMorale: number;
  confidence: number;
  followers: number;
  jobId: JobId | null;
  agentId: string | null;
  injuryWeeks: number;
  seasonStats: SeasonStats;
  careerStats: SeasonStats;
  /** Ratings of the most recent matches played (newest last). */
  form: number[];
  history: SeasonRecord[];
  sponsors: ActiveSponsor[];
  national: NationalStats;
}

export interface LeagueTeam {
  name: string;
  strength: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scored: number;
  conceded: number;
  points: number;
  isPlayerClub: boolean;
}

export interface LeagueState {
  division: number;
  teams: LeagueTeam[];
  /** 12 rounds; each round is a list of [homeIndex, awayIndex] pairs. */
  rounds: Array<Array<[number, number]>>;
  /** Fixtures from the round where the player's club had a bye (played on the last matchday). */
  extraFixtures: Array<[number, number]>;
}

export type MatchRole = 'starter' | 'rotation' | 'bench' | 'injured';

export interface MatchLogEntry {
  eventId: string;
  title: string;
  choice: string;
  success: boolean;
  text: string;
}

export interface MatchResult {
  teamScore: number;
  oppScore: number;
  outcome: 'win' | 'draw' | 'loss';
  rating: number | null;
  overtime: boolean;
  motm: boolean;
}

export interface PendingOutcome {
  success: boolean;
  skillCheck: boolean;
  text: string;
  effects: Effects;
}

export interface TimelineEntry {
  /** Game minute (football 0-95, basketball 0-40, overtime beyond). */
  minute: number;
  kind: 'goal' | 'score' | 'chance' | 'card' | 'sub' | 'period' | 'info' | 'moment' | 'run' | 'highlight';
  side: 'team' | 'opp' | 'neutral';
  text: string;
  /** Points / goals this entry adds to each side. */
  team: number;
  opp: number;
  /** Scoring buckets that move the score without a feed line. */
  hidden?: boolean;
  /** Involves the player. */
  mine?: boolean;
  /** Base entries can be rewritten (e.g. before a clutch moment); decision results cannot. */
  base?: boolean;
}

export interface MatchInfoState {
  venue: string;
  city: string;
  attendance: number;
  weather: string;
  weatherLabel: string;
  temperature: number;
  referee: string;
  kickoff: string;
  derby: boolean;
}

export interface MatchExtraStats {
  possession: number;
  shotsTeam: number;
  shotsOpp: number;
}

export interface MatchState {
  opponent: string;
  /** Set for national team matches (no league table impact). */
  national: NationalLevel | null;
  opponentStrength: number;
  home: boolean;
  role: MatchRole;
  preEventId: string | null;
  inGameEventIds: string[];
  inGameIndex: number;
  postEventId: string | null;
  clutch: boolean;
  log: MatchLogEntry[];
  playerGoals: number;
  playerAssists: number;
  playerPoints: number;
  playerRebounds: number;
  ratingDelta: number;
  /** Live match */
  info: MatchInfoState | null;
  timeline: TimelineEntry[];
  clock: number;
  totalMinutes: number;
  decisionMinutes: number[];
  base: { goals: number; assists: number; points: number; rebounds: number };
  extra: MatchExtraStats | null;
  pendingOutcome: PendingOutcome | null;
  result: MatchResult | null;
}

export interface NewsItem {
  id: string;
  category: NewsCategory;
  text: string;
  season: number;
  matchday: number;
}

export interface TransferOffer {
  id: string;
  club: string;
  division: number;
  contract: ContractType;
  weeklySalary: number;
  signingBonus: number;
  role: 'starter' | 'rotation';
  strength: number;
}

export interface SeasonSummary {
  season: number;
  finalPosition: number;
  promoted: boolean;
  relegated: boolean;
  champion: boolean;
  stats: SeasonStats;
  table: LeagueTeam[];
}

export type GamePhase =
  | 'setup'
  | 'dashboard'
  | 'preMatch'
  | 'inGame'
  | 'matchSummary'
  | 'postMatch'
  | 'transfer'
  | 'seasonEnd'
  | 'callUp'
  | 'live';

export interface NationalCallUp {
  level: NationalLevel;
  opponent: string;
  opponentStrength: number;
  home: boolean;
}

export interface GameFlags {
  agentDiscovered: boolean;
  eliteAgentOffered: boolean;
  captainOfferSeason: number;
  postedThisWeek: boolean;
  shiftsThisWeek: number;
  jobWarnings: number;
  raiseAskedSeason: number;
  transferPush: boolean;
  ownsBoots: boolean;
  jobRaise: number;
  /** The first brand has shown interest (news sent once). */
  sponsorInterest?: boolean;
  /** One-time situations already played. */
  usedOnce?: string[];
  /** This season's storyline and the next chapter to tell (0-based). */
  story?: { id: string; season: number; chapter: number };
  /** Storylines already told in this career. */
  storiesUsed?: string[];
}

export interface GameState {
  version: number;
  phase: GamePhase;
  player: Player;
  league: LeagueState;
  season: number;
  /** Number of completed matchdays in the current season (0..12). */
  matchday: number;
  weekSlots: number;
  pendingLifeEventId: string | null;
  lifeOutcome: PendingOutcome | null;
  currentMatch: MatchState | null;
  news: NewsItem[];
  seenEvents: string[];
  transferOffers: TransferOffer[];
  transferContext: 'midseason' | 'endseason' | null;
  seasonSummary: SeasonSummary | null;
  nationalCallUp: NationalCallUp | null;
  flags: GameFlags;
  /** Short toast-like message after a dashboard action. */
  toast: string | null;
  /** What happened during the week (shown before the match). */
  weekRecap?: string[];
}

export interface SetupData {
  name: string;
  shirtNumber: number;
  sport: SportType;
  position: Position;
  home: HomePlace;
  club: string;
  jobId: JobId;
}
