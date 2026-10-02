import { BadgePercent, Handshake, Lock, Megaphone, Star, UserRound, UserX } from 'lucide-react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { AGENTS, FORM_MATCHES, getAgent } from '../../data/agents';
import { recentForm } from '../../services/playerUtils';
import { agentInterested } from '../../state/gameLogic';
import type { Player } from '../../types/game';
import { Sheet } from '../ui/Sheet';
import { GoldButton } from '../ui/GoldButton';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function AgentSheet({ state, dispatch, onClose }: Props) {
  const { player, flags } = state;
  const agent = getAgent(player.agentId);

  if (!agent && !flags.agentDiscovered) {
    return (
      <Sheet title="הסוכן שלי" subtitle="עוד אף סוכן לא התקשר" icon={Lock} onClose={onClose}>
        <div className="mb-4 rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 leading-relaxed">
            סוכנים לא מסתכלים על מספרים על הנייר. הם יושבים ביציע ובודקים ציונים. רצף של משחקים טובים, ובעיקר משחקים גדולים, והטלפון יצלצל לבד.
          </p>
          <FormStrip player={player} />
        </div>
      </Sheet>
    );
  }

  if (!agent) {
    return (
      <Sheet title="סוכנים מתעניינים" subtitle="בחרו מי ייצג אתכם" icon={Handshake} onClose={onClose}>
        <AgentList player={player} onSign={(id) => dispatch({ type: 'SIGN_AGENT', agentId: id })} />
      </Sheet>
    );
  }

  return (
    <Sheet title="הסוכן שלי" subtitle={agent.agency} icon={Handshake} onClose={onClose}>
      <div className="mb-3 rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <UserRound size={24} />
          </div>
          <div>
            <div className="text-lg font-extrabold">{agent.name}</div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <Star key={i} size={14} className={i < agent.level ? 'fill-sun text-sun' : 'text-line'} />
              ))}
              <span className="mr-1 flex items-center gap-1 text-xs text-muted">
                <BadgePercent size={12} />
                עמלה {Math.round(agent.commission * 100)}%
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted">{agent.description}</p>
        <p className="mt-2 rounded-lg bg-brand/10 px-2.5 py-1.5 text-xs font-semibold text-brand">
          משפר את תנאי החסויות שלך ב-{agent.level * 10}% (לפני עמלה)
        </p>
      </div>
      <div className="space-y-2">
        <GoldButton onClick={() => dispatch({ type: 'AGENT_PUSH' })} disabled={flags.transferPush}>
          <Megaphone size={18} />
          {flags.transferPush ? 'הסוכן כבר מפיץ את השם שלך' : 'לבקש לדחוף להעברה בחלון הבא'}
        </GoldButton>
        <GoldButton variant="ghost" onClick={() => dispatch({ type: 'FIRE_AGENT' })}>
          <UserX size={18} />
          להיפרד מהסוכן
        </GoldButton>
      </div>
    </Sheet>
  );
}

/** The player's last match ratings and the average agents and sponsors look at. */
export function FormStrip({ player }: { player: Player }) {
  const form = recentForm(player);
  const last = (player.form ?? []).slice(-5);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted">כושר: ציונים אחרונים</span>
        <span className="font-black text-brand">{form === null ? `עוד ${FORM_MATCHES - last.length} משחקים` : `ממוצע ${form.toFixed(1)}`}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }, (_, i) => {
          const r = last[i];
          const tone = r === undefined ? 'bg-line/50 text-muted' : r >= 7.5 ? 'bg-emerald-500/20 text-emerald-300' : r >= 6.5 ? 'bg-brand/15 text-brand' : 'bg-rose-500/15 text-rose-300';
          return (
            <div key={i} className={`flex-1 rounded-lg py-1.5 text-center text-sm font-black tabular-nums ${tone}`}>
              {r === undefined ? '-' : r.toFixed(1)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentList({ player, onSign }: { player: Player; onSign: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-line bg-card p-3">
        <FormStrip player={player} />
      </div>
      {AGENTS.map((a) => {
        const locked = !agentInterested(a, player);
        return (
          <div key={a.id} className={`rounded-2xl border border-line bg-card p-3 ${locked ? 'opacity-50' : ''}`}>
            <div className="mb-1 flex items-center justify-between">
              <div className="font-extrabold">{a.name}</div>
              <div className="flex">
                {Array.from({ length: 3 }, (_, i) => (
                  <Star key={i} size={13} className={i < a.level ? 'fill-sun text-sun' : 'text-line'} />
                ))}
              </div>
            </div>
            <p className="mb-2 text-xs text-muted">{a.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">עמלה {Math.round(a.commission * 100)}%</span>
              <button
                disabled={locked}
                onClick={() => onSign(a.id)}
                className="btn-gold chamfer rounded-md px-4 py-1.5 text-sm font-black"
              >
                {locked ? 'עוד לא מתעניין' : 'לחתום'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
