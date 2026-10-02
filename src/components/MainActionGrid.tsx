import { ChartNoAxesColumn, Briefcase, Dumbbell, Lock, Smartphone, Sofa, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState } from '../types/game';
import { getJob } from '../data/jobs';
import { getAgent, AGENT_UNLOCK } from '../data/agents';
import { formatFollowers } from '../services/playerUtils';

export type ActionSheetId = 'training' | 'job' | 'agent' | 'lifestyle' | 'social' | 'stats';

interface GridItem {
  id: ActionSheetId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  locked?: boolean;
  alert?: boolean;
}

interface MainActionGridProps {
  state: GameState;
  onOpen: (id: ActionSheetId) => void;
}

export function MainActionGrid({ state, onOpen }: MainActionGridProps) {
  const { player, flags } = state;
  const job = getJob(player.jobId);
  const agent = getAgent(player.agentId);
  const agentLocked = !agent && !flags.agentDiscovered;
  const needsJob = player.contract !== 'pro' && !job;

  const items: GridItem[] = [
    { id: 'training', title: 'אימונים', subtitle: 'שיפור תכונות', icon: Dumbbell },
    {
      id: 'job',
      title: 'עבודה',
      subtitle: player.contract === 'pro' ? 'מקצוען, בלי עבודה' : job ? `${flags.shiftsThisWeek} משמרות השבוע` : 'חובה לבחור עבודה',
      icon: Briefcase,
      alert: needsJob || (Boolean(job) && player.contract !== 'pro' && flags.shiftsThisWeek === 0 && flags.jobWarnings > 0),
    },
    {
      id: 'agent',
      title: 'הסוכן שלי',
      subtitle: agent ? agent.name : agentLocked ? `נפתח ב-OVR ${AGENT_UNLOCK.ovr}` : 'סוכנים מתעניינים',
      icon: agentLocked ? Lock : UserRound,
      locked: agentLocked,
      alert: !agent && flags.agentDiscovered,
    },
    { id: 'lifestyle', title: 'סגנון חיים', subtitle: 'מנוחה והתאוששות', icon: Sofa },
    { id: 'social', title: 'מדיה ורשתות', subtitle: `${formatFollowers(player.followers)} עוקבים`, icon: Smartphone },
    { id: 'stats', title: 'סטטיסטיקות', subtitle: 'טבלה ונתונים', icon: ChartNoAxesColumn },
  ];

  return (
    <section className="grid grid-cols-2 gap-2.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onOpen(item.id)}
            className={`relative flex items-center gap-3 rounded-2xl border p-3 text-right transition active:scale-[0.98] ${
              item.locked ? 'border-line bg-card/50 text-muted' : 'border-line bg-card hover:border-amber-500/60'
            }`}
          >
            {item.alert && <span className="absolute left-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500" />}
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                item.locked ? 'bg-line text-muted' : 'bg-amber-500/15 text-gold'
              }`}
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold leading-tight">{item.title}</div>
              <div className="truncate text-xs text-muted">{item.subtitle}</div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
