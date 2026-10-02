import type { Agent } from '../types/game';

export const AGENTS: Agent[] = [
  {
    id: 'agent_avi',
    name: 'אבי שמעוני',
    agency: 'שמעוני ניהול ספורטאים',
    level: 1,
    commission: 0.05,
    description: 'סוכן שכונתי שמכיר כל מאמן בליגות הנמוכות. עמלה נמוכה, קשרים מקומיים.',
    minOvr: 0,
  },
  {
    id: 'agent_roni',
    name: 'רוני דהן',
    agency: 'דהן ספורט גרופ',
    level: 2,
    commission: 0.08,
    description: 'סוכנות בינונית עם קשרים טובים בליגה הלאומית ובליגה א׳.',
    minOvr: 50,
  },
  {
    id: 'agent_michal',
    name: 'מיכל ברק',
    agency: 'ברק מנג׳מנט',
    level: 3,
    commission: 0.12,
    description: 'הסוכנת הכי חזקה בארץ. מגיעה רק לשחקנים שכבר מריחים ליגת העל.',
    minOvr: 60,
  },
];

export function getAgent(id: string | null | undefined): Agent | null {
  if (!id) return null;
  return AGENTS.find((a) => a.id === id) ?? null;
}

/** Thresholds that unlock the agent system. */
export const AGENT_UNLOCK = { ovr: 52, fanRep: 55, bigGames: 2 };
