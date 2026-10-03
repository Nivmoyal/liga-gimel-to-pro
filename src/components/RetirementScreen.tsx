import { Award, Flag, Medal, RotateCcw, Trophy, Users } from 'lucide-react';
import type { GameState } from '../types/game';
import { SPORT_LABEL, divisionName, positionLabel } from '../data/sports';
import { ACHIEVEMENTS } from '../services/careerEngine';
import { averageRating, calcOvr, formatFollowers } from '../services/playerUtils';
import { clubIdentity } from '../data/clubIdentity';
import { castOf } from '../state/gameLogic';
import { Crest } from './art/Crest';
import { Jersey } from './art/Jersey';

/** The end of the road: the whole career on one page. */
export function RetirementScreen({ state, onNewCareer }: { state: GameState; onNewCareer: () => void }) {
  const { player, flags } = state;
  const c = player.careerStats;
  const clubs = [...new Set([...player.history.map((h) => h.club), player.club])];
  const peak = Math.max(calcOvr(player), ...player.history.map((h) => h.ovr));
  const best = Math.max(...player.history.map((h) => h.division), player.division);
  const unlocked = new Set((flags.achievements ?? []).map((a) => a.id));
  const cast = castOf(state);
  const football = player.sport === 'football';
  const numbers = [
    { label: 'עונות', value: player.history.length },
    { label: 'משחקים', value: c.apps },
    { label: football ? 'שערים' : 'נקודות', value: football ? c.goals : c.points },
    { label: football ? 'בישולים' : 'ריבאונדים', value: football ? c.assists : c.rebounds },
    { label: 'ציון ממוצע', value: averageRating(c).toFixed(2) },
    { label: 'שחקן המשחק', value: c.motm },
  ];
  const trophies = [
    { icon: Trophy, label: 'אליפויות', value: flags.titles ?? 0 },
    { icon: Medal, label: 'גביעי מדינה', value: flags.cupWins ?? 0 },
    { icon: Flag, label: 'הופעות בנבחרת', value: player.national.caps + player.national.u21Caps },
  ];
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6">
      <section className="rounded-2xl border border-brand/40 bg-card p-5 text-center shadow-lg shadow-black/40">
        <div className="mb-1 text-xs font-bold text-brand">סוף הקריירה</div>
        <Jersey
          primary={clubIdentity(player.club).colors.primary}
          secondary={clubIdentity(player.club).colors.secondary}
          name={player.name}
          number={player.shirtNumber}
          sport={player.sport}
          width={90}
          className="mx-auto"
        />
        <h1 className="mt-2 text-2xl font-black">{player.name}</h1>
        <p className="text-sm text-muted">
          {SPORT_LABEL[player.sport]} | {positionLabel(player.position)} | פרש בגיל {state.retired?.age ?? player.age}
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          מ{player.home.name} ועד {divisionName(player.sport, best)}. דירוג שיא {peak}, {formatFollowers(player.followers)} עוקבים.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {trophies.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="rounded-2xl border border-line bg-card p-3 text-center">
              <Icon size={18} className="mx-auto text-amber-300" />
              <div className="text-xl font-black">{t.value}</div>
              <div className="text-[11px] text-muted">{t.label}</div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-3 gap-2">
        {numbers.map((n) => (
          <div key={n.label} className="rounded-xl bg-card p-2 text-center">
            <div className="text-lg font-black text-brand">{n.value}</div>
            <div className="text-[10px] text-muted">{n.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 font-extrabold">המועדונים</h2>
        <div className="flex flex-wrap gap-2">
          {clubs.map((club) => (
            <span key={club} className="flex items-center gap-1.5 rounded-lg bg-pitch px-2 py-1 text-sm">
              <Crest name={club} size={16} />
              {club}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 flex items-center gap-2 font-extrabold">
          <Award size={18} className="text-brand" />
          הישגים ({unlocked.size}/{ACHIEVEMENTS.length})
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).map((a) => (
            <span key={a.id} className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-bold text-brand">
              {a.title}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed">
        <h2 className="mb-1 flex items-center gap-2 font-extrabold">
          <Users size={18} className="text-brand" />
          מה שנשאר
        </h2>
        {cast.friend} עדיין מספר לכולם שהיה בחדר ההלבשה איתך. גם {cast.rival} מ{cast.rivalClub} שלח הודעה: &quot;היה כבוד לשחק נגדך.&quot;
      </section>

      <button onClick={onNewCareer} className="btn-gold flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-black">
        <RotateCcw size={18} />
        קריירה חדשה
      </button>
    </div>
  );
}
