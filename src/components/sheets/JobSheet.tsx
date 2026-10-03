import { Briefcase, Car, Factory, GraduationCap, Pizza, ShieldCheck, Wrench, Zap, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameState, JobId } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { JOBS, getJob } from '../../data/jobs';
import { formatMoney } from '../../services/playerUtils';
import { Sheet } from '../ui/Sheet';
import { GoldButton } from '../ui/GoldButton';

export const JOB_ICONS: Record<JobId, LucideIcon> = {
  pizza: Pizza,
  security: ShieldCheck,
  factory: Factory,
  mechanic: Wrench,
  instructor: GraduationCap,
};

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function JobSheet({ state, dispatch, onClose }: Props) {
  const { player, flags } = state;
  const job = getJob(player.jobId);

  if (player.contract === 'pro') {
    return (
      <Sheet title="עבודה אזרחית" icon={Briefcase} onClose={onClose}>
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="mb-1 flex items-center gap-2 font-extrabold text-emerald-400">
            <Car size={18} />
            שחקן מקצוען במשרה מלאה
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            עם חוזה מקצועני מלא אין צורך יותר בעבודה אזרחית. כל הזמן שלך מוקדש לאימונים ולמשחקים.
          </p>
        </div>
      </Sheet>
    );
  }

  if (!job) {
    return (
      <Sheet title="בחירת עבודה" subtitle="בליגות הנמוכות חייבים עבודה כדי לשרוד" icon={Briefcase} onClose={onClose}>
        <JobPicker onPick={(jobId) => dispatch({ type: 'CHOOSE_JOB', jobId })} />
      </Sheet>
    );
  }

  const Icon = JOB_ICONS[job.id];
  const pay = job.payPerShift + flags.jobRaise;
  return (
    <Sheet title="העבודה שלי" subtitle="כסף בכיס, פחות כוח ברגליים" icon={Briefcase} onClose={onClose}>
      <div className="mb-3 rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Icon size={22} />
          </div>
          <div>
            <div className="text-lg font-extrabold">{job.name}</div>
            <div className="text-xs text-muted">{job.description}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-pitch p-2">
            <div className="text-[11px] text-muted">למשמרת</div>
            <div className="font-bold text-brand">{formatMoney(pay)}</div>
          </div>
          <div className="rounded-xl bg-pitch p-2">
            <div className="text-[11px] text-muted">אנרגיה</div>
            <div className="font-bold text-rose-400">-{job.energyCost}%</div>
          </div>
          <div className="rounded-xl bg-pitch p-2">
            <div className="text-[11px] text-muted">השבוע</div>
            <div className="font-bold">{flags.shiftsThisWeek} משמרות</div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">בונוס: {job.perk.label}</p>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-xl bg-brand/10 p-3 text-xs text-amber-200">
        <TriangleAlert size={16} className="shrink-0" />
        <span>
          משמרת אחת בשבוע נעשית לבד לפני כל מחזור, כשיש לך כוח לזה.
          {flags.jobWarnings > 0 ? ' השבוע שעבר לא הגעת למשמרת, והבוס כבר הזהיר.' : ''}
        </span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <GoldButton variant="ghost" onClick={() => dispatch({ type: 'ASK_RAISE' })} disabled={flags.raiseAskedSeason === state.season}>
            לבקש העלאה
          </GoldButton>
          <GoldButton variant="ghost" onClick={() => dispatch({ type: 'QUIT_JOB' })}>
            להתפטר
          </GoldButton>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1 text-xs text-muted">
        <Zap size={12} /> העבודה מתבטלת אוטומטית עם חתימה על חוזה מקצועני בליגה הלאומית או בליגת העל.
      </p>
    </Sheet>
  );
}

export function JobPicker({ onPick, selected }: { onPick: (id: JobId) => void; selected?: JobId | null }) {
  return (
    <div className="space-y-2">
      {JOBS.map((job) => {
        const Icon = JOB_ICONS[job.id];
        const active = selected === job.id;
        return (
          <button
            key={job.id}
            onClick={() => onPick(job.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${
              active ? 'border-brand bg-brand/10' : 'border-line bg-card hover:border-brand/50'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{job.name}</div>
              <div className="text-xs leading-snug text-muted">{job.description}</div>
            </div>
            <div className="shrink-0 text-left text-xs">
              <div className="font-bold text-brand">{formatMoney(job.payPerShift)}</div>
              <div className="text-rose-400">-{job.energyCost}%</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
