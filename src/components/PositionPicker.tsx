import type { Position, SportType } from '../types/game';
import { OVR_WEIGHTS, attrLabels, positionsFor } from '../data/sports';
import type { AttrKey } from '../types/game';

interface Spot {
  id: Position;
  /** Classic shirt number for the spot. */
  num?: number;
  /** Marker centre in % of the field (x from the left, y from the top). */
  x: number;
  y: number;
}

// Our team attacks upwards. One marker per position (a back four with two
// centre-backs shares the CB choice).
const FOOTBALL_SPOTS: Spot[] = [
  { id: 'ST', x: 50, y: 12 },
  { id: 'LW', x: 15, y: 21 },
  { id: 'RW', x: 85, y: 21 },
  { id: 'CAM', x: 50, y: 30 },
  { id: 'CM', x: 50, y: 44 },
  { id: 'LWB', x: 13, y: 49 },
  { id: 'RWB', x: 87, y: 49 },
  { id: 'CDM', x: 50, y: 57 },
  { id: 'LB', x: 15, y: 70 },
  { id: 'RB', x: 85, y: 70 },
  { id: 'CB', x: 36, y: 76 },
  { id: 'CB', x: 64, y: 76 },
  { id: 'GK', x: 50, y: 90 },
];

/** Short tags under the football markers (full names appear below the pitch). */
const FIELD_TAG: Partial<Record<Position, string>> = {
  GK: 'שוער',
  LB: 'מגן ש׳',
  CB: 'בלם',
  RB: 'מגן י׳',
  LWB: 'כנף אחורי',
  RWB: 'כנף אחורי',
  CDM: 'קשר אחורי',
  CM: 'קשר',
  CAM: 'קשר התקפי',
  LW: 'כנף ש׳',
  RW: 'כנף י׳',
  ST: 'חלוץ',
};

// Half court, basket at the top.
const BASKETBALL_SPOTS: Spot[] = [
  { id: 'C', x: 50, y: 25 },
  { id: 'PF', x: 25, y: 33 },
  { id: 'SF', x: 84, y: 45 },
  { id: 'SG', x: 15, y: 62 },
  { id: 'PG', x: 50, y: 78 },
];

const ROLE_TEXT: Record<Position, string> = {
  GK: 'השומר האחרון. הצלות, יציאות לכדורים גבוהים, פנדלים ופתיחת התקפות. טעות אחת שלך היא שער.',
  LB: 'מגן בצד שמאל. עוצר את הכנף של היריבה, עולה לחפות ומרים לרחבה.',
  CB: 'הלב של ההגנה. נגיחות, תיקולים, קריאת משחק ופתיחת כדור מאחור.',
  RB: 'מגן בצד ימין. עוצר את הכנף של היריבה, עולה לחפות ומרים לרחבה.',
  LWB: 'מגן כנף שמאלי במערך של שלושה בלמים. אחראי על כל הקו: גם הגנה וגם הגבהות.',
  RWB: 'מגן כנף ימני במערך של שלושה בלמים. אחראי על כל הקו: גם הגנה וגם הגבהות.',
  CDM: 'המגן שלפני ההגנה. חוטף כדורים, סוגר מעברים ומחלק את הכדור הראשון.',
  CM: 'המנוע של הקבוצה. מחלק כדורים, מכתיב קצב ועוזר גם בהגנה.',
  CAM: 'מספר 10. מאחורי החלוץ: מסירה אחרונה, בעיטות מרחוק ורגעי קסם.',
  LW: 'כנף שמאל. מהירות, דריבלים, חדירה פנימה ובעיטה או הגבהה.',
  RW: 'כנף ימין. מהירות, דריבלים, חדירה פנימה ובעיטה או הגבהה.',
  ST: 'מסיים את ההתקפות. נמדד בשערים, במצבים ובקור רוח מול השוער.',
  PG: 'מוביל הכדור. מריץ מהלכים, מחלק אסיסטים ומנהל את הקצב.',
  SG: 'הקלעי. זריקות מחוץ לקשת וחדירות לסל.',
  SF: 'השחקן הכי רב גוני: קולע, מגן על הכנפיים ותורם בכל מקום.',
  PF: 'עובד קשה בצבע. ריבאונדים, חסימות וזריקה מחצי מרחק.',
  C: 'הגבוה מתחת לסל. שולט בריבאונד, חוסם ומסיים קרוב.',
};

function topAttributes(position: Position, sport: SportType): string {
  const weights = OVR_WEIGHTS[position];
  return (Object.keys(weights) as AttrKey[])
    .sort((a, b) => weights[b] - weights[a])
    .slice(0, 3)
    .map((k) => attrLabels(sport, position)[k])
    .join(' | ');
}

function FootballLines() {
  return (
    <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6">
      <rect x="4" y="4" width="92" height="132" rx="1" />
      <line x1="4" y1="70" x2="96" y2="70" />
      <circle cx="50" cy="70" r="12" />
      <rect x="24" y="4" width="52" height="20" />
      <rect x="38" y="4" width="24" height="7" />
      <rect x="24" y="116" width="52" height="20" />
      <rect x="38" y="129" width="24" height="7" />
      <path d="M 40 24 A 12 12 0 0 0 60 24" />
      <path d="M 40 116 A 12 12 0 0 1 60 116" />
    </g>
  );
}

function CourtLines() {
  return (
    <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6">
      <rect x="4" y="4" width="92" height="132" rx="1" />
      <rect x="33" y="4" width="34" height="40" />
      <circle cx="50" cy="44" r="12" />
      <path d="M 10 4 L 10 26 A 42 42 0 0 0 90 26 L 90 4" />
      <line x1="42" y1="10" x2="58" y2="10" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />
      <circle cx="50" cy="13" r="2.4" stroke="#f2994a" strokeWidth="0.8" />
      <path d="M 38 136 A 12 12 0 0 1 62 136" />
    </g>
  );
}

/** Positions shown where they play on a pitch or a half court; tap to choose. */
export function PositionPicker({ sport, value, onPick }: { sport: SportType; value: Position | null; onPick: (p: Position) => void }) {
  const spots = sport === 'football' ? FOOTBALL_SPOTS : BASKETBALL_SPOTS;
  const labels = Object.fromEntries(positionsFor(sport).map((p) => [p.id, p])) as Record<string, { label: string; short: string }>;
  const fieldBg =
    sport === 'football'
      ? 'repeating-linear-gradient(0deg, #14361f 0 9%, #183d24 9% 18%)'
      : 'repeating-linear-gradient(90deg, #6b4a2b 0 6%, #73502f 6% 12%)';
  return (
    <div>
      <div className="relative mx-auto w-full max-w-[330px] overflow-hidden rounded-2xl border border-line shadow-lg shadow-black/40" style={{ aspectRatio: '100 / 140', background: fieldBg }}>
        <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full" aria-hidden>
          {sport === 'football' ? <FootballLines /> : <CourtLines />}
        </svg>
        {spots.map((spot, i) => {
          const active = value === spot.id;
          return (
            <button
              key={`${spot.id}-${i}`}
              onClick={() => onPick(spot.id)}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              aria-label={labels[spot.id].label}
              aria-pressed={active}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-black shadow-md transition ${
                  active ? 'scale-110 border-white bg-brand text-black shadow-brand/50' : 'border-white/80 bg-black/60 text-white'
                }`}
              >
                {spot.num ?? spot.id}
              </span>
              <span className={`whitespace-nowrap rounded px-1 text-[10px] font-bold ${active ? 'bg-brand text-black' : 'bg-black/55 text-white'}`}>
                {sport === 'football' ? FIELD_TAG[spot.id] : labels[spot.id].short}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 min-h-[76px] rounded-2xl border border-line bg-card p-3">
        {value ? (
          <>
            <div className="font-black text-brand">{labels[value]?.label}</div>
            <p className="text-sm leading-relaxed">{ROLE_TEXT[value]}</p>
            <p className="mt-1 text-xs text-muted">תכונות מרכזיות: {topAttributes(value, sport)}</p>
          </>
        ) : (
          <p className="text-sm text-muted">לחצו על עמדה במגרש כדי לבחור איפה תשחקו.</p>
        )}
      </div>
    </div>
  );
}
