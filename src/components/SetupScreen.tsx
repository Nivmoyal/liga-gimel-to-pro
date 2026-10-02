import { useEffect, useMemo, useState } from 'react';
import { Car, ChevronLeft, ChevronRight, Goal, Hash, MapPin, Search, UserRound, Volleyball, Briefcase } from 'lucide-react';
import type { HomePlace, JobId, Position, SetupData, SportType } from '../types/game';
import { commuteCost, nearestStartingClubs, searchPlaces } from '../data/places';
import { DIVISIONS, SPORT_LABEL, divisionName, positionsFor } from '../data/sports';
import { JobPicker } from './sheets/JobSheet';
import { PositionPicker } from './PositionPicker';
import { GoldButton } from './ui/GoldButton';
import { ScenePhoto } from './art/ScenePhoto';
import { Jersey } from './art/Jersey';
import { Crest } from './art/Crest';
import { clubIdentity } from '../data/clubIdentity';

const STEPS = ['שחקן וענף', 'עמדה', 'בית ומועדון', 'עבודה אזרחית'];

export function SetupScreen({ onStart, onBack }: { onStart: (setup: SetupData) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [sport, setSport] = useState<SportType | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [homeQuery, setHomeQuery] = useState('');
  const [home, setHome] = useState<HomePlace | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [club, setClub] = useState<string | null>(null);
  const [jobId, setJobId] = useState<JobId | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const canNext = [
    name.trim().length >= 2 && sport !== null && number !== '' && Number(number) >= 0 && Number(number) <= 99,
    position !== null,
    home !== null && club !== null,
    jobId !== null,
  ][step];

  const shirtColors = club ? clubIdentity(club).colors : { primary: '#2f6bff', secondary: '#ffffff', text: '#ffffff' };
  const shirtPreview = (width: number) => (
    <Jersey
      primary={shirtColors.primary}
      secondary={shirtColors.secondary}
      name={name || 'השם שלך'}
      number={number === '' ? '?' : number}
      sport={sport ?? 'football'}
      sponsor={club ? clubIdentity(club).shirtSponsor : undefined}
      width={width}
    />
  );

  const pickSport = (s: SportType) => {
    if (s !== sport) {
      setPosition(null);
      setClub(null);
    }
    setSport(s);
  };

  const suggestions = useMemo(() => (home && homeQuery === home.name ? [] : searchPlaces(homeQuery)), [homeQuery, home]);
  const nearby = useMemo(() => (home && sport ? nearestStartingClubs(sport, home) : []), [home, sport]);
  const visibleClubs = showAll ? nearby : nearby.slice(0, 6);
  const chosen = nearby.find((c) => c.name === club);

  const pickHome = (place: HomePlace) => {
    setHome(place);
    setHomeQuery(place.name);
    setShowAll(false);
    setClub(null);
  };

  const typeHome = (value: string) => {
    setHomeQuery(value);
    if (home && value !== home.name) {
      setHome(null);
      setClub(null);
    }
  };

  const finish = () => {
    if (!sport || !position || !home || !club || !jobId) return;
    onStart({ name: name.trim(), shirtNumber: Number(number), sport, position, home, club, jobId });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        <div className="relative -mx-4 -mt-5 mb-4 overflow-hidden rounded-b-3xl shadow-lg shadow-brand/20">
          <ScenePhoto scene={step === 0 ? 'stadium' : 'locker'} sport={sport ?? 'football'} height={step === 0 ? 190 : 120} fade={false} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pb-3 pt-14 text-white">
            <h1 className="text-2xl font-black leading-tight">מליגה ג׳ למקצוענות</h1>
            <p className="text-sm text-white/85">קריירה ישראלית בכדורגל או בכדורסל</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`} />
              <div className={`mt-1 truncate text-[10px] ${i === step ? 'font-bold text-brand' : 'text-muted'}`}>{label}</div>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-3">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                    <UserRound size={16} className="text-brand" />
                    שם מלא
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={24}
                    placeholder="לדוגמה: דניאל אברהם"
                    className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-lg outline-none placeholder:text-muted/60 focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                    <Hash size={16} className="text-brand" />
                    מספר חולצה
                  </span>
                  <input
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    inputMode="numeric"
                    placeholder="10"
                    className="w-24 rounded-2xl border border-line bg-card px-4 py-3 text-center text-lg font-black outline-none focus:border-brand"
                    aria-label="מספר חולצה"
                  />
                </label>
              </div>
              <div className="shrink-0">{shirtPreview(112)}</div>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-bold">באיזה ענף מתחילים?</span>
              <div className="grid grid-cols-2 gap-3">
                {(['football', 'basketball'] as SportType[]).map((s) => {
                  const Icon = s === 'football' ? Goal : Volleyball;
                  const active = sport === s;
                  return (
                    <button
                      key={s}
                      onClick={() => pickSport(s)}
                      className={`rounded-2xl border p-4 text-right transition ${active ? 'border-brand bg-brand/10' : 'border-line bg-card hover:border-brand/50'}`}
                    >
                      <Icon size={28} className={active ? 'text-brand' : 'text-muted'} />
                      <div className="mt-2 text-lg font-black">{SPORT_LABEL[s]}</div>
                      <div className="text-xs text-muted">
                        מתחילים ב{s === 'football' ? divisionName(s, 0) : `${DIVISIONS[s][0]} / ${DIVISIONS[s][1]}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 1 && sport && (
          <div>
            <p className="mb-3 text-sm text-muted">איפה אתם משחקים? העמדה קובעת אילו תכונות חשובות לדירוג ואילו מצבים תפגשו במשחק.</p>
            <PositionPicker sport={sport} value={position} onPick={setPosition} />
          </div>
        )}

        {step === 2 && sport && (
          <div className="space-y-4">
            <div>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                  <MapPin size={16} className="text-brand" />
                  איפה אתם גרים, או רוצים לגור?
                </span>
                <div className="relative">
                  <Search size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={homeQuery}
                    onChange={(e) => typeHome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && suggestions[0]) pickHome(suggestions[0]);
                    }}
                    maxLength={30}
                    placeholder="לדוגמה: קריית שמונה, חולון, אופקים"
                    className="w-full rounded-2xl border border-line bg-card py-3 pl-4 pr-11 text-lg outline-none placeholder:text-muted/60 focus:border-brand"
                    aria-label="עיר מגורים"
                  />
                </div>
              </label>
              {suggestions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-card">
                  {suggestions.map((place) => (
                    <button
                      key={place.name}
                      onClick={() => pickHome(place)}
                      className="flex w-full items-center gap-2 border-b border-line px-4 py-2.5 text-right last:border-b-0 hover:bg-brand/10"
                    >
                      <MapPin size={15} className="text-brand" />
                      <span className="font-bold">{place.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {!home && homeQuery.trim().length >= 2 && suggestions.length === 0 && (
                <p className="mt-2 text-xs text-muted">לא מצאנו את המקום. נסו עיר או יישוב קרוב.</p>
              )}
              {!home && homeQuery.trim().length < 2 && (
                <p className="mt-2 text-xs text-muted">נציע לכם את המועדונים הקרובים ביותר. מועדון רחוק אומר נסיעות ארוכות לאימונים.</p>
              )}
            </div>

            {club && (
              <div className="flex items-center gap-4 rounded-2xl border border-brand/30 bg-brand/5 p-3">
                {shirtPreview(96)}
                <div className="min-w-0">
                  <div className="text-xs text-muted">החולצה החדשה שלך</div>
                  <div className="truncate text-lg font-black">{club}</div>
                  <div className="text-xs text-muted">חסות חולצה: {clubIdentity(club).shirtSponsor}</div>
                  {chosen && commuteCost(chosen.km).energy > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-sun">
                      <Car size={13} />
                      {commuteCost(chosen.km).label}: עולה {commuteCost(chosen.km).energy} אנרגיה בשבוע
                    </div>
                  )}
                </div>
              </div>
            )}

            {home && (
              <div>
                <span className="mb-1.5 block text-sm font-bold">המועדונים הקרובים ל{home.name}</span>
                <div className="space-y-2">
                  {visibleClubs.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setClub(c.name)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${club === c.name ? 'border-brand bg-brand/10' : 'border-line bg-card hover:border-brand/50'}`}
                    >
                      <Crest name={c.name} size={30} className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{c.name}</span>
                        <span className="block text-xs text-muted">{divisionName(sport, c.division)}</span>
                      </span>
                      <span className={`shrink-0 text-sm font-black ${c.km <= 15 ? 'text-brand' : 'text-muted'}`}>
                        {c.km < 3 ? 'בעיר' : `${c.km} ק״מ`}
                      </span>
                    </button>
                  ))}
                </div>
                {nearby.length > visibleClubs.length && (
                  <button onClick={() => setShowAll(true)} className="mt-2 w-full rounded-xl py-2 text-sm font-bold text-brand hover:bg-brand/10">
                    הצג את כל {nearby.length} המועדונים
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-3 flex items-start gap-2 rounded-xl bg-card p-3 text-sm text-muted">
              <Briefcase size={18} className="mt-0.5 shrink-0 text-brand" />
              <p>בליגות הנמוכות אף אחד לא חי מ{sport ? SPORT_LABEL[sport] : 'ספורט'}. עבודה מכניסה כסף אבל שורפת אנרגיה. היא תתבטל לבד כשתחתום על חוזה מקצועני מלא.</p>
            </div>
            <JobPicker selected={jobId} onPick={setJobId} />
            {club && (
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-line bg-card p-3">
                {shirtPreview(84)}
                <div className="min-w-0 text-sm">
                  <div className="text-lg font-black">{name}</div>
                  <div className="text-muted">
                    {sport ? SPORT_LABEL[sport] : ''} | {position ? positionsFor(sport!).find((p) => p.id === position)?.label : ''}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted">
                    <Crest name={club} size={16} />
                    {club}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-6 flex gap-2">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : onBack())}
          className="flex items-center gap-1 rounded-md border border-line bg-card px-4 py-3.5 font-bold text-muted hover:text-ink"
        >
          <ChevronRight size={18} />
          חזרה
        </button>
        {step < STEPS.length - 1 ? (
          <GoldButton disabled={!canNext} onClick={() => setStep(step + 1)}>
            המשך
            <ChevronLeft size={18} />
          </GoldButton>
        ) : (
          <GoldButton disabled={!canNext} onClick={finish}>
            מתחילים קריירה
            <ChevronLeft size={18} />
          </GoldButton>
        )}
      </footer>
    </div>
  );
}
