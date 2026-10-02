import { ArrowLeftRight, Building, Coins, Signature, Star } from 'lucide-react';
import type { GameState } from '../types/game';
import type { GameAction } from '../state/gameReducer';
import { CONTRACT_LABEL, divisionName } from '../data/sports';
import { getAgent } from '../data/agents';
import { formatMoney } from '../services/playerUtils';
import { Sheet } from './ui/Sheet';
import { GoldButton } from './ui/GoldButton';
import { Crest } from './art/Crest';
import { Jersey } from './art/Jersey';
import { clubIdentity } from '../data/clubIdentity';

interface Props {
  state: GameState;
  dispatch: (a: GameAction) => void;
}

export function TransferWindowModal({ state, dispatch }: Props) {
  const { player, transferOffers, transferContext } = state;
  const agent = getAgent(player.agentId);
  const mid = transferContext === 'midseason';
  return (
    <Sheet
      title={mid ? 'חלון העברות - אמצע עונה' : 'חלון העברות - הקיץ'}
      subtitle={mid ? 'אחרי מחזור 6: הצעות על השולחן' : 'לפני העונה הבאה'}
      icon={ArrowLeftRight}
      footer={
        <GoldButton variant="ghost" onClick={() => dispatch({ type: 'DECLINE_OFFERS' })}>
          {transferOffers.length ? `לדחות הכל ולהישאר ב${player.club}` : 'להמשיך'}
        </GoldButton>
      }
    >
      <div className="mb-3 rounded-xl bg-card p-3 text-sm text-muted">
        היום: {player.club} | {divisionName(player.sport, player.division)} | {CONTRACT_LABEL[player.contract]} | {formatMoney(player.weeklySalary)} לשבוע
        {agent && <div className="mt-1 text-xs">עמלת {agent.name}: {Math.round(agent.commission * 100)}% מכל שכר ומענק</div>}
      </div>
      {transferOffers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-6 text-center">
          <Building size={28} className="mx-auto mb-2 text-muted" />
          <p className="font-bold">אין הצעות הפעם</p>
          <p className="mt-1 text-sm text-muted">
            הטלפון שותק. שיפור בדירוג, ציונים גבוהים ומוניטין אוהדים, או סוכן שדוחף, יביאו הצעות בחלון הבא.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transferOffers.map((offer) => {
            const up = offer.division > player.division;
            return (
              <div key={offer.id} className={`rounded-2xl border p-4 ${up ? 'border-brand/50 bg-brand/5' : 'border-line bg-card'}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Crest name={offer.club} size={40} />
                    <div>
                      <div className="text-lg font-black">{offer.club}</div>
                      <div className="text-xs text-muted">{divisionName(player.sport, offer.division)}</div>
                    </div>
                  </div>
                  <Jersey
                    primary={clubIdentity(offer.club).colors.primary}
                    secondary={clubIdentity(offer.club).colors.secondary}
                    name={player.name}
                    number={player.shirtNumber}
                    sport={player.sport}
                    width={52}
                  />
                  {up && (
                    <span className="flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-black text-black">
                      <Star size={12} />
                      קפיצת מדרגה
                    </span>
                  )}
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-pitch p-2">
                    <div className="text-[11px] text-muted">שכר שבועי</div>
                    <div className="font-bold text-brand">{formatMoney(offer.weeklySalary)}</div>
                  </div>
                  <div className="rounded-xl bg-pitch p-2">
                    <div className="text-[11px] text-muted">מענק חתימה</div>
                    <div className="flex items-center gap-1 font-bold">
                      <Coins size={13} />
                      {formatMoney(offer.signingBonus)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-pitch p-2">
                    <div className="text-[11px] text-muted">סוג חוזה</div>
                    <div className="font-bold">{CONTRACT_LABEL[offer.contract]}</div>
                  </div>
                  <div className="rounded-xl bg-pitch p-2">
                    <div className="text-[11px] text-muted">הבטחת מאמן</div>
                    <div className="font-bold">{offer.role === 'starter' ? 'שחקן הרכב' : 'רוטציה'}</div>
                  </div>
                </div>
                {offer.contract === 'pro' && player.jobId && (
                  <p className="mb-2 text-xs text-emerald-400">חתימה תסיים אוטומטית את העבודה האזרחית.</p>
                )}
                <GoldButton onClick={() => dispatch({ type: 'ACCEPT_OFFER', offerId: offer.id })}>
                  <Signature size={18} />
                  לחתום ב{offer.club}
                </GoldButton>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
