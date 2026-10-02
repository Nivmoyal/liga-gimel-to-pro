import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Goal, Hash, MapPin, UserRound, Volleyball, Briefcase } from 'lucide-react';
import type { JobId, Position, RegionId, SetupData, SportType } from '../types/game';
import { REGIONS, getRegion } from '../data/clubs';
import { DIVISIONS, SPORT_LABEL, divisionName, positionsFor } from '../data/sports';
import { JobPicker } from './sheets/JobSheet';
import { GoldButton } from './ui/GoldButton';
import { ScenePhoto } from './art/ScenePhoto';
import { Jersey } from './art/Jersey';
import { Crest } from './art/Crest';
import { clubIdentity } from '../data/clubIdentity';

const STEPS = ['שחקן וענף', 'עמדה', 'אזור ומועדון', 'עבודה אזרחית'];

export function SetupScreen({ onStart, onBack }: { onStart: (setup: SetupData) => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('10');
  const [sport, setSport] = useState<SportType | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [region, setRegion] = useState<RegionId | null>(null);
  const [club, setClub] = useState<string | null>(null);
  const [jobId, setJobId] = useState<JobId | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const canNext = [
    name.trim().length >= 2 && sport !== null && number !== '' && Number(number) >= 0 && Number(number) <= 99,
    position !== null,
    region !== null && club !== null,
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

  const pickRegion = (r: RegionId) => {
    setRegion(r);
    const clubs = getRegion(r).clubs[sport!];
    setClub(clubs.length === 1 ? clubs[0].name : null);
  };

  const finish = () => {
    if (!sport || !position || !region || !club || !jobId) return;
    onStart({ name: name.trim(), shirtNumber: Number(number), sport, position, region, club, jobId });
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
            <p className="mb-3 text-sm text-muted">העמדה קובעת אילו תכונות חשובות לדירוג ואילו מצבים תפגוש במשחק.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {positionsFor(sport).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPosition(p.id)}
                  className={`rounded-2xl border p-4 text-right font-bold transition ${position === p.id ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-card hover:border-brand/50'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && sport && (
          <div className="space-y-4">
            <div className="space-y-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pickRegion(r.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${region === r.id ? 'border-brand bg-brand/10' : 'border-line bg-card hover:border-brand/50'}`}
                >
                  <MapPin size={18} className={region === r.id ? 'text-brand' : 'text-muted'} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{r.name}</div>
                    <div className="truncate text-xs text-muted">{r.description}</div>
                  </div>
                </button>
              ))}
            </div>
            {club && (
              <div className="flex items-center gap-4 rounded-2xl border border-brand/30 bg-brand/5 p-3">
                {shirtPreview(96)}
                <div className="min-w-0">
                  <div className="text-xs text-muted">החולצה החדשה שלך</div>
                  <div className="truncate text-lg font-black">{club}</div>
                  <div className="text-xs text-muted">חסות חולצה: {clubIdentity(club).shirtSponsor}</div>
                </div>
              </div>
            )}
            {region && (
              <div>
                <span className="mb-1.5 block text-sm font-bold">המועדון הראשון שלך</span>
                <div className="space-y-2">
                  {getRegion(region).clubs[sport].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setClub(c.name)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${club === c.name ? 'border-brand bg-brand/10' : 'border-line bg-card hover:border-brand/50'}`}
                    >
                      <Crest name={c.name} size={30} className="shrink-0" />
                      <span className="flex-1 font-bold">{c.name}</span>
                      <span className="text-xs text-muted">{divisionName(sport, c.division)}</span>
                    </button>
                  ))}
                </div>
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
