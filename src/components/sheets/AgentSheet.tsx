import { BadgePercent, Handshake, Lock, Megaphone, Star, UserRound, UserX } from 'lucide-react';
import type { GameState } from '../../types/game';
import type { GameAction } from '../../state/gameReducer';
import { AGENTS, AGENT_UNLOCK, getAgent } from '../../data/agents';
import { calcOvr } from '../../services/playerUtils';
import { Sheet } from '../ui/Sheet';
import { GoldButton } from '../ui/GoldButton';
import { StatBar } from '../ui/StatBar';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function AgentSheet({ state, dispatch, onClose }: Props) {
  const { player, flags } = state;
  const agent = getAgent(player.agentId);
  const ovr = calcOvr(player);

  if (!agent && !flags.agentDiscovered) {
    return (
      <Sheet title="הסוכן שלי" subtitle="נעול" icon={Lock} onClose={onClose}>
        <div className="mb-4 rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 leading-relaxed">
            עדיין אף סוכן לא שם לב אליך. סוכנים מתחילים להתקשר כששחקן מגיע לאחד מהיעדים הבאים:
          </p>
          <div className="space-y-3">
            <StatBar label={`דירוג כללי (יעד ${AGENT_UNLOCK.ovr})`} value={ovr} max={AGENT_UNLOCK.ovr} />
            <StatBar label={`מוניטין אוהדים (יעד ${AGENT_UNLOCK.fanRep})`} value={player.fanRep} max={AGENT_UNLOCK.fanRep} />
            <StatBar label={`משחקים בציון 8+ (יעד ${AGENT_UNLOCK.bigGames})`} value={player.careerStats.motm} max={AGENT_UNLOCK.bigGames} />
          </div>
        </div>
      </Sheet>
    );
  }

  if (!agent) {
    return (
      <Sheet title="סוכנים מתעניינים" subtitle="בחרו מי ייצג אתכם" icon={Handshake} onClose={onClose}>
        <AgentList ovr={ovr} onSign={(id) => dispatch({ type: 'SIGN_AGENT', agentId: id })} />
      </Sheet>
    );
  }

  return (
    <Sheet title="הסוכן שלי" subtitle={agent.agency} icon={Handshake} onClose={onClose}>
      <div className="mb-3 rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-gold">
            <UserRound size={24} />
          </div>
          <div>
            <div className="text-lg font-extrabold">{agent.name}</div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }, (_, i) => (
                <Star key={i} size={14} className={i < agent.level ? 'fill-amber-500 text-amber-500' : 'text-line'} />
              ))}
              <span className="mr-1 flex items-center gap-1 text-xs text-muted">
                <BadgePercent size={12} />
                עמלה {Math.round(agent.commission * 100)}%
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted">{agent.description}</p>
      </div>
      <div className="space-y-2">
        <GoldButton onClick={() => dispatch({ type: 'AGENT_PUSH' })} disabled={flags.transferPush}>
          <Megaphone size={18} />
          {flags.transferPush ? 'הסוכן כבר מפיץ את השם שלך' : 'לבקש לדחוף להעברה בחלון הבא'}
        </GoldButton>
        <GoldButton variant="ghost" onClick={() => dispatch({ type: 'AGENT_SPONSOR' })} disabled={flags.sponsorSeason === state.season}>
          {flags.sponsorSeason === state.season ? 'חסות העונה כבר נסגרה' : 'לסגור חסות אישית'}
        </GoldButton>
        <GoldButton variant="ghost" onClick={() => dispatch({ type: 'FIRE_AGENT' })}>
          <UserX size={18} />
          להיפרד מהסוכן
        </GoldButton>
      </div>
    </Sheet>
  );
}

function AgentList({ ovr, onSign }: { ovr: number; onSign: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {AGENTS.map((a) => {
        const locked = ovr < a.minOvr;
        return (
          <div key={a.id} className={`rounded-2xl border border-line bg-card p-3 ${locked ? 'opacity-50' : ''}`}>
            <div className="mb-1 flex items-center justify-between">
              <div className="font-extrabold">{a.name}</div>
              <div className="flex">
                {Array.from({ length: 3 }, (_, i) => (
                  <Star key={i} size={13} className={i < a.level ? 'fill-amber-500 text-amber-500' : 'text-line'} />
                ))}
              </div>
            </div>
            <p className="mb-2 text-xs text-muted">{a.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">עמלה {Math.round(a.commission * 100)}%</span>
              <button
                disabled={locked}
                onClick={() => onSign(a.id)}
                className="rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-bold text-black hover:bg-amber-400 disabled:bg-line disabled:text-muted"
              >
                {locked ? `דורש OVR ${a.minOvr}` : 'לחתום'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
