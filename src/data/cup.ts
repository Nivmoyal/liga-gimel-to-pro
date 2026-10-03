// גביע המדינה: knockout rounds played in midweek between league matchdays.
// Rounds get harder: the deeper the run, the higher the opponents' league.

export interface CupRound {
  name: string;
  /** Played right after this league matchday. */
  afterMatchday: number;
  /** Leagues above the player's that the opponent comes from. */
  up: number;
  /** Prize money for winning the round, before the league factor. */
  prize: number;
}

export const CUP_NAME = 'גביע המדינה';

export const CUP_ROUNDS: CupRound[] = [
  { name: 'הסיבוב הראשון', afterMatchday: 2, up: 0, prize: 300 },
  { name: 'שמינית הגמר', afterMatchday: 5, up: 1, prize: 600 },
  { name: 'רבע הגמר', afterMatchday: 7, up: 1, prize: 1000 },
  { name: 'חצי הגמר', afterMatchday: 10, up: 2, prize: 2000 },
  { name: 'הגמר', afterMatchday: 11, up: 3, prize: 5000 },
];
