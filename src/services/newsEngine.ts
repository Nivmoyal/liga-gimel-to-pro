import type { MatchResult, NewsCategory, NewsItem, Player, SportType } from '../types/game';
import type { FixtureResult } from './leagueEngine';
import { divisionName } from '../data/sports';
import { freshLine } from '../data/commentary';

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
  const margin = Math.abs(result.teamScore - result.oppScore);
  const big = player.sport === 'football' ? margin >= 3 : margin >= 15;
  const close = player.sport === 'football' ? margin === 1 : margin <= 4;
  const club = player.club;
  const win = player.sport === 'football' ? 'שלוש נקודות' : 'ניצחון';
  const headlines =
    result.outcome === 'win'
      ? big
        ? ['big_win', [`${club} ריסקה את ${opponent} ${score}`, `ניצחון ענק ל${club}: ${score} על ${opponent}`, `${club} דרסה את ${opponent} ${score}`, `ערב חגיגי: ${club} ${score} על ${opponent}`]]
        : close
          ? ['close_win', [`${club} גברה בדוחק על ${opponent} ${score}`, `ניצחון צמוד ל${club}, ${score} על ${opponent}`, `${club} סחטה ניצחון מול ${opponent} ${score}`, `עד הסוף: ${club} ניצחה את ${opponent} ${score}`]]
          : ['win', [`${club} ניצחה את ${opponent} ${score}`, `${club} גברה על ${opponent} ${score}`, `${win} ל${club}: ${score} מול ${opponent}`, `${club} חזרה מ${opponent} עם ניצחון ${score}`]]
      : result.outcome === 'loss'
        ? big
          ? ['big_loss', [`${club} ספגה תבוסה מ${opponent} ${score}`, `ערב קשה ל${club}: ${score} מול ${opponent}`, `${club} התרסקה מול ${opponent} ${score}`]]
          : close
            ? ['close_loss', [`${club} הפסידה בדוחק ל${opponent} ${score}`, `הפסד צמוד ל${club}, ${score} מול ${opponent}`, `כמעט: ${club} נפלה מול ${opponent} ${score}`]]
            : ['loss', [`${club} הפסידה ל${opponent} ${score}`, `${club} לא עמדה מול ${opponent}: ${score}`, `הפסד ל${club}, ${score} מול ${opponent}`]]
        : ['draw', [`${club} סיימה בתיקו מול ${opponent} ${score}`, `נקודה אחת ל${club}: ${score} מול ${opponent}`, `${club} ו${opponent} נפרדו ב-${score}`, `תיקו ${score} בין ${club} ל${opponent}`]];
  let clubLine = `${freshLine(`news.${headlines[0]}`, headlines[1] as string[])}${result.overtime ? ' אחרי הארכה' : ''}.`;
  if (result.rating !== null) {
    const r = result.rating.toFixed(1);
    if (player.sport === 'football') {
      const parts: string[] = [];
      if (stats.goals) parts.push(stats.goals === 1 ? 'שער' : `${stats.goals} שערים`);
      if (stats.assists) parts.push(stats.assists === 1 ? 'בישול' : `${stats.assists} בישולים`);
      const extra = parts.length ? ` (${parts.join(', ')})` : '';
      clubLine += ` ${freshLine('news.rating', [`${player.name} קיבל ציון ${r}`, `ציון ${r} ל${player.name}`, `${player.name} סיים עם ציון ${r}`, `הציון של ${player.name}: ${r}`])}${extra}.`;
    } else {
      const { points: p, rebounds: rb, assists: a } = stats;
      clubLine += ` ${freshLine('news.line', [`${player.name}: ${p} נק׳, ${rb} ריב׳, ${a} אס׳`, `${player.name} רשם ${p} נקודות, ${rb} ריבאונדים ו-${a} אסיסטים`, `${player.name} סיים עם ${p} נקודות ו-${rb} ריבאונדים (${a} אסיסטים)`])}.`;
    }
  } else {
    clubLine += ` ${freshLine('news.dnp', [`${player.name} לא שותף במשחק`, `${player.name} צפה מהצד`, `${player.name} לא עלה למגרש`])}.`;
  }
  items.push(makeNews('club', clubLine, season, matchday));

  if (result.rating !== null) {
    if (result.rating >= 8) {
      items.push(
        makeNews(
          'fans',
          freshLine('news.fansHigh', [
            `האוהדים של ${club} שרים את השם של ${player.name} אחרי הופעה מטורפת`,
            `"תנו לו חוזה לכל החיים" - הרשת משתגעת אחרי המשחק של ${player.name}`,
            `ביציע כבר קוראים ל${player.name} "הכוכב של השכונה"`,
            `הקטעים של ${player.name} מהמשחק נגד ${opponent} רצים בכל הקבוצות`,
            `"ראיתם מה ${player.name} עשה?" - האוהדים של ${club} לא מפסיקים לדבר`,
            `ילדים בשכונה כבר מחקים את ${player.name}`,
            `${player.name} נבחר על ידי האוהדים לשחקן המשחק`,
            `החולצה של ${player.name} אוזלת בחנות של ${club}`,
          ]),
          season,
          matchday,
        ),
      );
    } else if (result.rating <= 5.2) {
      items.push(
        makeNews(
          'fans',
          freshLine('news.fansLow', [
            `אוהדים ברשת: "${player.name} צריך להתעורר, וכמה שיותר מהר"`,
            `תסכול ביציע: ${player.name} עם אחד המשחקים החלשים שלו העונה`,
            `"אולי פחות משמרות ויותר אימונים?" - אוהדי ${club} לא סולחים`,
            `ביקורת ברשת על ${player.name} אחרי המשחק מול ${opponent}`,
            `"זה לא ה${player.name} שהכרנו" - אוהדי ${club} מאוכזבים`,
            `שריקות מהיציע כשהמאמן הוציא את ${player.name}`,
            `גם הוותיקים ביציע של ${club} מחכים לראות את ${player.name} חוזר לעצמו`,
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
  const md = `מחזור ${matchday}`;
  const line = (r: FixtureResult) => {
    const winner = r.homeScore >= r.awayScore ? r.home : r.away;
    const loser = winner === r.home ? r.away : r.home;
    return { winner, loser, score: scoreLine(sport, Math.max(r.homeScore, r.awayScore), Math.min(r.homeScore, r.awayScore)) };
  };
  // Each round tells a different kind of story: a thrashing, a goal fest, a draw or an away win.
  const stories: Array<() => string | null> = [
    () => {
      const r = [...results].sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore))[0];
      if (r.homeScore === r.awayScore) return null;
      const { winner, loser, score } = line(r);
      return freshLine('news.roundBig', [`${md}: ${winner} ריסקה את ${loser} ${score}`, `${md}: ערב קשה ל${loser}, ${score} מול ${winner}`, `${md}: ${winner} לא ריחמה על ${loser}, ${score}`]);
    },
    () => {
      const r = [...results].sort((a, b) => b.homeScore + b.awayScore - (a.homeScore + a.awayScore))[0];
      return freshLine('news.roundHigh', [
        `${md}: חגיגת ${sport === 'football' ? 'שערים' : 'סלים'} בין ${r.home} ל${r.away}, ${scoreLine(sport, r.homeScore, r.awayScore)}`,
        `${md}: המשחק הכי פתוח של המחזור, ${r.home} ${scoreLine(sport, r.homeScore, r.awayScore)} ${r.away}`,
      ]);
    },
    () => {
      const r = results.find((x) => x.homeScore === x.awayScore);
      if (!r) return null;
      return freshLine('news.roundDraw', [`${md}: ${r.home} ו${r.away} נפרדו ב-${scoreLine(sport, r.homeScore, r.awayScore)}`, `${md}: אף אחת לא ויתרה, תיקו בין ${r.home} ל${r.away}`]);
    },
    () => {
      const r = results.find((x) => x.awayScore > x.homeScore);
      if (!r) return null;
      return freshLine('news.roundAway', [`${md}: ${r.away} ניצחה בחוץ את ${r.home}, ${scoreLine(sport, r.awayScore, r.homeScore)}`, `${md}: ${r.home} מאוכזבת, ${r.away} לוקחת את הניצחון מהבית שלה`]);
    },
  ];
  const order = stories.map((s, i) => ({ s, k: (i + matchday) % stories.length })).sort((a, b) => a.k - b.k);
  for (const { s } of order) {
    const text = s();
    if (text) return [makeNews('league', text, season, matchday)];
  }
  return [];
}

export function rumorNews(player: Player, ovr: number, divisionStrengthAbove: number | null, season: number, matchday: number): NewsItem | null {
  if (divisionStrengthAbove === null) return null;
  if (ovr < divisionStrengthAbove - 4 || Math.random() > 0.35) return null;
  const nextDivision = divisionName(player.sport, player.division + 1);
  return makeNews(
    'rumors',
    freshLine('news.rumor', [
      `שמועה: סקאוטים מ${nextDivision} נראו ביציע במשחק של ${player.club}`,
      `לפי גורם במועדון, קבוצה מ${nextDivision} מתעניינת ב${player.name}`,
      `${player.name} על הכוונת? מאמן מ${nextDivision} שאל עליו השבוע`,
      `בשבוע האחרון התקבלו ב${player.club} שתי שיחות על ${player.name}`,
      `בליגה מדברים: ${player.name} עשוי לעלות ל${nextDivision} כבר בקיץ`,
      `סקאוט מ${nextDivision} ביקש את הקטעים של ${player.name}`,
      `"הוא שחקן של ${nextDivision}" - מאמן יריב מחמיא ל${player.name}`,
    ]),
    season,
    matchday,
  );
}
