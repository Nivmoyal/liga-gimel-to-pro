# מליגה ג׳ למקצוענות

משחק קריירה בעברית לשחקן ישראלי בכדורגל או בכדורסל: מתחילים בליגות הנמוכות עם עבודה אזרחית, ומטפסים עד ליגת העל.
מובייל קודם, RTL מלא, עיצוב בהיר וקליל, אייקונים של `lucide-react` בלבד (בלי אימוג׳י).

## מה יש במשחק

- **סמלי קבוצות** נוצרים אוטומטית לכל מועדון (צבעי המועדון, תבנית וראשי תיבות), כולל סמלי נבחרות.
- **איורים** בכל סיטואציה: מצבי משחק בכדורגל ובכדורסל, חדר הלבשה, מסיבת עיתונאים, עבודה, בית ועוד, בצבעי שתי הקבוצות.
- **חולצה אישית** עם השם והמספר שבחרתם, בצבעי המועדון ועם ספונסר החולצה שלו.
- **ספונסרים**: מותגים (בדיוניים) שנפתחים לפי עוקבים, מוניטין, דירוג וליגה. משלמים כל שבוע, עד 3 במקביל.
- **נבחרת ישראל**: בפגרות הנבחרות (אחרי מחזורים 4 ו-9) שחקן עם דירוג וציונים גבוהים מזומן לנבחרת הבוגרת או לנבחרת עד גיל 21, בכדורגל ובכדורסל.

## הרצה

```bash
npm install
npm run dev        # שרת פיתוח
npm test           # בדיקות: מנוע אירועים, חוק אפס אימוג׳י, ומשחק אוטומטי של 3 עונות לכל ענף
npm run build      # בדיקת טיפוסים ובנייה לפרודקשן
```

## מבנה

| נתיב | תפקיד |
| --- | --- |
| `src/App.tsx` | שורש האפליקציה: הרשמה, לוח הבקרה, גיליונות פעולה וזרימת המחזור |
| `src/types/game.ts` | טיפוסי Player, SportType, GameEvent, Match, Job, Club ועוד |
| `src/state/gameLogic.ts` | כל מעברי המצב (פונקציות טהורות): אימון, עבודה, מחזור, העברות, סוף עונה |
| `src/state/gameReducer.ts` | ה-reducer שמחבר פעולות UI ללוגיקה |
| `src/services/eventEngine.ts` | טעינת JSON, החלפת placeholders, סינון לפי ענף ותנאים, בדיקות מיומנות |
| `src/services/matchEngine.ts` | סימולציית משחק סביב ההחלטות של השחקן, ציון ותרומה אישית |
| `src/services/leagueEngine.ts` | ליגה של 13 קבוצות, 12 מחזורים (round robin), טבלה ותוצאות |
| `src/services/transferEngine.ts` | הצעות בחלון ההעברות (מחזור 6 וסוף עונה) |
| `src/data/events/*.json` | אירועי לפני משחק, בתוך משחק, ראיונות ואירועי חיים |
| `src/components/art/` | SceneArt (איורים), Crest (סמלים), Jersey (חולצה), SponsorLogo |
| `src/data/clubIdentity.ts`, `sponsors.ts`, `national.ts` | צבעי מועדונים, ספונסרים ונבחרות |
| `src/components/` | HeaderStats, MainActionGrid, PreMatchModal, InGameEventModal, PostMatchInterview, SocialFeed ועוד |

## הוספת אירועים

כל אירוע הוא אובייקט JSON עם 3 בחירות. בחירה עם `stat` ו-`difficulty` היא בדיקת מיומנות, ואז חייבת להיות לה תוצאת `fail`.

```json
{
  "id": "life_100",
  "type": "life",
  "sport": "both",
  "speaker": "המאמן",
  "title": "כותרת",
  "scene": "office",
  "text": "{שחקן} מ{קבוצה} פוגש את {יריבה} על {משטח}",
  "conditions": { "requiresJob": true, "maxDivision": 2 },
  "choices": [
    { "label": "...", "success": { "text": "...", "effects": { "fanRep": 3 } } },
    { "label": "...", "stat": "mental", "difficulty": 50,
      "success": { "text": "...", "effects": { "confidence": 4 } },
      "fail": { "text": "...", "effects": { "confidence": -3 } } },
    { "label": "...", "success": { "text": "...", "effects": {} } }
  ]
}
```

Placeholders: `{שחקן}` `{קבוצה}` `{יריבה}` `{עבודה}` `{סוכן}` `{משטח}` `{ספורט}`.
תנאים זמינים: `minDivision`, `maxDivision`, `requiresJob`, `requiresAgent`, `contract`, `minOvr`, `positions`, `matchResult`, `minMatchday`.
השדה `scene` בוחר איור (למשל `fb_penalty`, `bb_three`, `locker`, `press`, `phone`). אירועים עם `trigger` נבחרים רק בהקשר מיוחד (למשל `national_pre`).
אירועי בתוך משחק עם `"clutch": true` משאירים את המשחק צמוד כך שההחלטה מכריעה אותו.
המנוע מסנן ומגריל לפי משקל ומונע חזרה על אירועים שנראו לאחרונה, כך שאפשר להגדיל את המאגר לאלפי אירועים בלי לשנות קוד.
