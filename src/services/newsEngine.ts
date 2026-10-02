import type { MatchResult, NewsCategory, NewsItem, Player, SportType } from '../types/game';
import type { FixtureResult } from './leagueEngine';
import { divisionName } from '../data/sports';
import { pickRandom } from './playerUtils';

let counter = 0;

export function makeNews(category: NewsCategory, text: string, season: number, matchday: number): NewsItem {
  counter += 1;
  return { id: `n_${Date.now().toString(36)}_${counter}`, category, text, season, matchday };
}

function scoreLine(sport: SportType, a: number, b: number) {
  return sport === 'basketball' ? `${a}:${b}` : `${a}-${b}`;
}

export function matchNews(
  player: Player,
  opponent: string,
  result: MatchResult,
  stats: { goals: number; assists: number; points: number; rebounds: number },
  season: number,
  matchday: number,
): NewsItem[] {
  const items: NewsItem[] = [];
  const score = scoreLine(player.sport, result.teamScore, result.oppScore);
  const verb = result.outcome === 'win' ? 'ניצחה את' : result.outcome === 'loss' ? 'הפסידה ל' : 'סיימה בתיקו מול';
  const joiner = result.outcome === 'loss' ? '' : ' ';
  let clubLine = `${player.club} ${verb}${joiner}${opponent} ${score}${result.overtime ? ' אחרי הארכה' : ''}.`;
  if (result.rating !== null) {
    if (player.sport === 'football') {
      const parts: string[] = [];
      if (stats.goals) parts.push(stats.goals === 1 ? 'שער' : `${stats.goals} שערים`);
      if (stats.assists) parts.push(stats.assists === 1 ? 'בישול' : `${stats.assists} בישולים`);
      clubLine += ` ${player.name} קיבל ציון ${result.rating.toFixed(1)}${parts.length ? ` (${parts.join(', ')})` : ''}.`;
    } else {
      clubLine += ` ${player.name}: ${stats.points} נק׳, ${stats.rebounds} ריב׳, ${stats.assists} אס׳.`;
    }
  } else {
    clubLine += ` ${player.name} לא שותף במשחק.`;
  }
  items.push(makeNews('club', clubLine, season, matchday));

  if (result.rating !== null) {
    if (result.rating >= 8) {
      items.push(
        makeNews(
          'fans',
          pickRandom([
            `האוהדים של ${player.club} שרים את השם של ${player.name} אחרי הופעה מטורפת`,
            `"תנו לו חוזה לכל החיים" - הרשת משתגעת אחרי המשחק של ${player.name}`,
            `ביציע כבר קוראים ל${player.name} "הכוכב של השכונה"`,
          ]),
          season,
          matchday,
        ),
      );
    } else if (result.rating <= 5.2) {
      items.push(
        makeNews(
          'fans',
          pickRandom([
            `אוהדים ברשת: "${player.name} צריך להתעורר, וכמה שיותר מהר"`,
            `תסכול ביציע: ${player.name} עם אחד המשחקים החלשים שלו העונה`,
            `"אולי פחות משמרות ויותר אימונים?" - אוהדי ${player.club} לא סולחים`,
          ]),
          season,
          matchday,
        ),
      );
    }
  }
  return items;
}

export function leagueRoundNews(sport: SportType, results: FixtureResult[], season: number, matchday: number): NewsItem[] {
  if (results.length === 0) return [];
  // Highlight the biggest margin of the round.
  const biggest = [...results].sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore))[0];
  const winner = biggest.homeScore >= biggest.awayScore ? biggest.home : biggest.away;
  const loser = winner === biggest.home ? biggest.away : biggest.home;
  const hi = Math.max(biggest.homeScore, biggest.awayScore);
  const lo = Math.min(biggest.homeScore, biggest.awayScore);
  const text =
    biggest.homeScore === biggest.awayScore
      ? `מחזור ${matchday}: ${biggest.home} ו${biggest.away} נפרדו ב-${scoreLine(sport, hi, lo)}`
      : `מחזור ${matchday}: ${winner} ריסקה את ${loser} ${scoreLine(sport, hi, lo)}`;
  return [makeNews('league', text, season, matchday)];
}

export function rumorNews(player: Player, ovr: number, divisionStrengthAbove: number | null, season: number, matchday: number): NewsItem | null {
  if (divisionStrengthAbove === null) return null;
  if (ovr < divisionStrengthAbove - 4 || Math.random() > 0.35) return null;
  const nextDivision = divisionName(player.sport, player.division + 1);
  return makeNews(
    'rumors',
    pickRandom([
      `שמועה: סקאוטים מ${nextDivision} נראו ביציע במשחק של ${player.club}`,
      `לפי גורם במועדון, קבוצה מ${nextDivision} מתעניינת ב${player.name}`,
      `${player.name} על הכוונת? מאמן מ${nextDivision} שאל עליו השבוע`,
    ]),
    season,
    matchday,
  );
}
