import { useState } from 'react';
import { BadgeDollarSign, CalendarDays, Coins, Flag, Heart, History, RotateCcw, Smile, Users } from 'lucide-react';
import type { GameState } from '../../types/game';
import { getRegion } from '../../data/clubs';
import { ATTR_KEYS, ATTR_LABEL, CONTRACT_LABEL, SPORT_LABEL, divisionName, positionLabel } from '../../data/sports';
import { getAgent } from '../../data/agents';
import { averageRating, calcOvr, formatFollowers, formatMoney } from '../../services/playerUtils';
import { StatBar } from '../ui/StatBar';
import { clubIdentity } from '../../data/clubIdentity';
import { getSponsor } from '../../data/sponsors';
import { Jersey } from '../art/Jersey';
import { Crest } from '../art/Crest';
import { SponsorLogo } from '../art/SponsorLogo';

export function CareerView({ state, onReset }: { state: GameState; onReset: () => void }) {
  const { player } = state;
  const [confirm, setConfirm] = useState(false);
  const agent = getAgent(player.agentId);
  const facts = [
    { icon: CalendarDays, label: 'גיל', value: String(player.age) },
    { icon: Coins, label: 'שכר שבועי', value: formatMoney(player.weeklySalary) },
    { icon: Users, label: 'עוקבים', value: formatFollowers(player.followers) },
    { icon: Heart, label: 'מוניטין אוהדים', value: String(player.fanRep) },
    { icon: Smile, label: 'ביטחון', value: String(player.confidence) },
    { icon: Users, label: 'מורל קבוצתי', value: String(player.teamMorale) },
  ];
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <Jersey
            primary={clubIdentity(player.club).colors.primary}
            secondary={clubIdentity(player.club).colors.secondary}
            name={player.name}
            number={player.shirtNumber}
            sport={player.sport}
            sponsor={clubIdentity(player.club).shirtSponsor}
            width={74}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xl font-black">{player.name}</div>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Crest name={player.club} size={16} />
              <span className="truncate">{player.club}</span>
            </div>
            <div className="text-sm text-muted">
              {SPORT_LABEL[player.sport]} | {positionLabel(player.position)} | {getRegion(player.region).name}
            </div>
            <div className="text-xs text-muted">
              {CONTRACT_LABEL[player.contract]} | {agent ? `סוכן: ${agent.name}` : 'ללא סוכן'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-brand">{calcOvr(player)}</div>
            <div className="text-[10px] text-muted">OVR</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {facts.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="rounded-xl bg-pitch p-2 text-center">
                <Icon size={14} className="mx-auto mb-0.5 text-muted" />
                <div className="text-sm font-bold">{f.value}</div>
                <div className="text-[10px] text-muted">{f.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2.5 rounded-2xl border border-line bg-card p-4">
        <h2 className="font-extrabold">תכונות</h2>
        {ATTR_KEYS.map((k) => (
          <StatBar key={k} label={ATTR_LABEL[player.sport][k]} value={player.attributes[k]} max={99} tone="gold" />
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Flag size={18} className="text-brand" />
          נבחרת ישראל
        </h2>
        {player.national.caps + player.national.u21Caps === 0 ? (
          <p className="text-sm text-muted">
            עוד לא זומנת. בפגרות הנבחרות (אחרי מחזורים 4 ו-9) המאמן הלאומי בוחר שחקנים עם דירוג גבוה וציונים טובים. עד גיל 21 אפשר להגיע לנבחרת הצעירה.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'בוגרת', value: player.national.caps },
              { label: 'עד 21', value: player.national.u21Caps },
              { label: player.sport === 'football' ? 'שערים' : 'נקודות', value: player.sport === 'football' ? player.national.goals : player.national.points },
              {
                label: 'ציון ממוצע',
                value: (player.national.ratingSum / Math.max(1, player.national.caps + player.national.u21Caps)).toFixed(1),
              },
            ].map((c) => (
              <div key={c.label} className="rounded-xl bg-card-2 p-2">
                <div className="text-lg font-black text-brand">{c.value}</div>
                <div className="text-[10px] text-muted">{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <BadgeDollarSign size={18} className="text-brand" />
          ספונסרים
        </h2>
        {player.sponsors.length === 0 ? (
          <p className="text-sm text-muted">אין ספונסרים פעילים. אפשר לחתום דרך מדיה ורשתות.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {player.sponsors.map((s) => {
              const sponsor = getSponsor(s.id);
              return sponsor ? <SponsorLogo key={s.id} sponsor={sponsor} /> : null;
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <History size={18} className="text-brand" />
          היסטוריית קריירה
        </h2>
        {player.history.length === 0 ? (
          <p className="text-sm text-muted">העונה הראשונה עוד בעיצומה.</p>
        ) : (
          <ul className="space-y-2">
            {[...player.history].reverse().map((h) => (
              <li key={h.season} className="flex items-center justify-between rounded-xl bg-pitch p-2.5 text-sm">
                <div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <Crest name={h.club} size={16} />
                    עונה {h.season}: {h.club}
                  </div>
                  <div className="text-xs text-muted">
                    {divisionName(player.sport, h.division)} | מקום {h.finalPosition} | OVR {h.ovr}
                  </div>
                </div>
                <div className="text-left text-xs text-muted">
                  {player.sport === 'football' ? `${h.stats.goals} שערים` : `${h.stats.points} נק׳`}
                  <div>ציון {averageRating(h.stats).toFixed(2)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
        {confirm ? (
          <div className="space-y-2">
            <p className="text-sm">למחוק את הקריירה ולהתחיל מחדש? אי אפשר לבטל.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onReset} className="rounded-xl bg-rose-500 py-2.5 font-bold text-white hover:bg-rose-600">
                כן, להתחיל מחדש
              </button>
              <button onClick={() => setConfirm(false)} className="rounded-xl border border-line bg-card py-2.5 font-bold">
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="flex w-full items-center justify-center gap-2 py-1 font-bold text-rose-600">
            <RotateCcw size={16} />
            קריירה חדשה
          </button>
        )}
      </section>
    </div>
  );
}
