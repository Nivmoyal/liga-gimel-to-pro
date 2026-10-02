import type { Region, RegionId, SportType } from '../types/game';

export const REGIONS: Region[] = [
  {
    id: 'golan',
    name: 'רמת הגולן והגליל',
    description: 'מגרשים קרים, אוהדים נאמנים ונסיעות ארוכות',
    clubs: {
      football: [
        { name: 'הפועל צפון הגולן', sport: 'football', region: 'golan', division: 0 },
        { name: 'הפועל קצרין', sport: 'football', region: 'golan', division: 0 },
        { name: 'צעירי ראש פינה', sport: 'football', region: 'golan', division: 0 },
      ],
      basketball: [
        { name: 'הפועל גליל עליון/קצרין', sport: 'basketball', region: 'golan', division: 0 },
        { name: 'מ.ס. חצור', sport: 'basketball', region: 'golan', division: 0 },
        { name: 'אליצור ראש פינה', sport: 'basketball', region: 'golan', division: 0 },
      ],
    },
  },
  {
    id: 'north',
    name: 'צפון',
    description: 'ערי חוף ומסורת של כדור',
    clubs: {
      football: [{ name: 'בית״ר נהריה', sport: 'football', region: 'north', division: 0 }],
      basketball: [{ name: 'אליצור עכו', sport: 'basketball', region: 'north', division: 1 }],
    },
  },
  {
    id: 'sharon',
    name: 'שרון',
    description: 'מתקנים טובים ותחרות צפופה',
    clubs: {
      football: [{ name: 'הפועל הוד השרון', sport: 'football', region: 'sharon', division: 0 }],
      basketball: [{ name: 'אליצור נתניה B', sport: 'basketball', region: 'sharon', division: 1 }],
    },
  },
  {
    id: 'center',
    name: 'מרכז',
    description: 'הרבה סקאוטים, הרבה לחץ',
    clubs: {
      football: [{ name: 'השקמה רמת חן', sport: 'football', region: 'center', division: 0 }],
      basketball: [{ name: 'אליצור גבעתיים', sport: 'basketball', region: 'center', division: 1 }],
    },
  },
  {
    id: 'jerusalem',
    name: 'ירושלים',
    description: 'קהל חם ודרבים בוערים',
    clubs: {
      football: [{ name: 'מ.ס. ירושלים', sport: 'football', region: 'jerusalem', division: 0 }],
      basketball: [{ name: 'אליצור מעלה אדומים', sport: 'basketball', region: 'jerusalem', division: 1 }],
    },
  },
  {
    id: 'south',
    name: 'דרום',
    description: 'חום, אבק ורעב לניצחונות',
    clubs: {
      football: [{ name: 'מ.ס. באר שבע', sport: 'football', region: 'south', division: 0 }],
      basketball: [{ name: 'הפועל ערד', sport: 'basketball', region: 'south', division: 1 }],
    },
  },
];

export function getRegion(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

/** Opponent pools per sport and division index. Each pool has at least 13 clubs. */
export const CLUB_POOLS: Record<SportType, string[][]> = {
  football: [
    // ליגה ג׳
    [
      'הפועל צפון הגולן', 'הפועל קצרין', 'צעירי ראש פינה', 'בית״ר נהריה', 'הפועל הוד השרון',
      'השקמה רמת חן', 'מ.ס. ירושלים', 'מ.ס. באר שבע', 'הפועל מטולה', 'מכבי מעלות',
      'הפועל יקנעם', 'בני עין מאהל', 'הפועל שדרות', 'מכבי מבשרת', 'הפועל גבעת עדה',
      'אליצור יהוד', 'הפועל כפר ורדים',
    ],
    // ליגה ב׳
    [
      'מכבי יבנה', 'הפועל בני לוד', 'הפועל גבעת שמואל', 'מכבי כפר כנא', 'הפועל ביר אל מכסור',
      'הפועל מגאר', 'בית״ר קריית שמונה', 'הפועל צור שלום', 'הפועל קריית אתא', 'מכבי טמרה',
      'הפועל עתלית', 'הפועל דימונה', 'מכבי ערערה', 'הפועל אור יהודה',
    ],
    // ליגה א׳
    [
      'הפועל אשקלון', 'מכבי קריית גת', 'הפועל מגדל העמק', 'מכבי אחי נצרת', 'הפועל בית שאן',
      'הפועל ירוחם', 'מכבי קריית מלאכי', 'הפועל קלנסווה', 'מכבי שעריים', 'הפועל מרמורק',
      'הפועל טייבה', 'הפועל ערד', 'בני נצרת', 'מכבי נוף הגליל',
    ],
    // ליגה לאומית
    [
      'הפועל פתח תקווה', 'הפועל רעננה', 'הפועל כפר סבא', 'הפועל עפולה', 'הפועל ראשון לציון',
      'הפועל רמת גן', 'מכבי הרצליה', 'הפועל עכו', 'בני יהודה', 'הפועל נוף הגליל',
      'מכבי יפו', 'הפועל כפר שלם', 'הפועל אום אל פחם', 'עירוני טבריה',
    ],
    // ליגת העל
    [
      'מכבי תל אביב', 'מכבי חיפה', 'הפועל באר שבע', 'בית״ר ירושלים', 'הפועל תל אביב',
      'מכבי נתניה', 'הפועל חיפה', 'בני סכנין', 'הפועל ירושלים', 'מ.ס. אשדוד',
      'הפועל חדרה', 'מכבי בני ריינה', 'עירוני קריית שמונה', 'מכבי פתח תקווה',
    ],
  ],
  basketball: [
    // ליגה ב׳
    [
      'הפועל גליל עליון/קצרין', 'מ.ס. חצור', 'אליצור ראש פינה', 'הפועל שלומי', 'מכבי צפת',
      'אליצור קריית טבעון', 'הפועל יקנעם', 'מכבי עמק חפר', 'הפועל אבן יהודה', 'אליצור כרמיאל',
      'הפועל גדרה', 'מכבי ירוחם', 'הפועל עומר', 'אליצור אור עקיבא',
    ],
    // ליגה א׳
    [
      'אליצור עכו', 'אליצור נתניה B', 'אליצור גבעתיים', 'אליצור מעלה אדומים', 'הפועל ערד',
      'הפועל מבשרת ציון', 'מכבי שהם', 'אליצור קריית מוצקין', 'הפועל קריית ביאליק', 'מכבי נהריה',
      'בני רעננה', 'הפועל אופקים', 'מכבי מודיעין', 'אס״א תל אביב',
    ],
    // ליגה לאומית
    [
      'מכבי חיפה', 'הפועל עפולה', 'אליצור יבנה', 'מכבי הרצליה', 'הפועל רמת גן גבעתיים',
      'אליצור אשקלון', 'מכבי קריית גת', 'הפועל כפר סבא', 'עירוני כפר יונה', 'הפועל ראשון לציון',
      'הפועל ראש העין', 'מכבי קריית מוצקין', 'הפועל טבריה', 'אליצור שומרון',
    ],
    // ליגת העל
    [
      'מכבי תל אביב', 'הפועל תל אביב', 'הפועל ירושלים', 'הפועל חולון', 'הפועל באר שבע/דימונה',
      'מכבי ראשון לציון', 'בני הרצליה', 'עירוני נס ציונה', 'הפועל העמק', 'מכבי עירוני רמת גן',
      'אליצור נתניה', 'הפועל חיפה', 'עירוני קריית אתא', 'הפועל גליל עליון',
    ],
  ],
};

export function poolFor(sport: SportType, division: number): string[] {
  const pools = CLUB_POOLS[sport];
  return pools[Math.max(0, Math.min(division, pools.length - 1))];
}
