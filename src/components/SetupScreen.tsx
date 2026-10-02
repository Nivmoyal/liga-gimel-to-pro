import { useState } from 'react';
import { ChevronLeft, ChevronRight, Goal, MapPin, Shield, Trophy, UserRound, Volleyball, Briefcase } from 'lucide-react';
import type { JobId, Position, RegionId, SetupData, SportType } from '../types/game';
import { REGIONS, getRegion } from '../data/clubs';
import { DIVISIONS, SPORT_LABEL, divisionName, positionsFor } from '../data/sports';
import { JobPicker } from './sheets/JobSheet';
import { GoldButton } from './ui/GoldButton';

const STEPS = ['שחקן וענף', 'עמדה', 'אזור ומועדון', 'עבודה אזרחית'];

export function SetupScreen({ onStart }: { onStart: (setup: SetupData) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [region, setRegion] = useState<RegionId | null>(null);
  const [club, setClub] = useState<string | null>(null);
  const [jobId, setJobId] = useState<JobId | null>(null);

  const canNext = [
    name.trim().length >= 2 && sport !== null,
    position !== null,
    region !== null && club !== null,
    jobId !== null,
  ][step];

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
    onStart({ name: name.trim(), sport, position, region, club, jobId });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-black">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black leading-tight">מליגה ג׳ למקצוענות</h1>
            <p className="text-sm text-muted">קריירה ישראלית בכדורגל או בכדורסל</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? 'bg-amber-500' : 'bg-line'}`} />
              <div className={`mt-1 truncate text-[10px] ${i === step ? 'font-bold text-gold' : 'text-muted'}`}>{label}</div>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1">
        {step === 0 && (
          <div className="space-y-5">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                <UserRound size={16} className="text-gold" />
                שם מלא
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="לדוגמה: דניאל אברהם"
                className="w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-lg outline-none placeholder:text-muted/60 focus:border-amber-500"
              />
            </label>
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
                      className={`rounded-2xl border p-4 text-right transition ${active ? 'border-amber-500 bg-amber-500/10' : 'border-line bg-card hover:border-amber-500/50'}`}
                    >
                      <Icon size={28} className={active ? 'text-gold' : 'text-muted'} />
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
                  className={`rounded-2xl border p-4 text-right font-bold transition ${position === p.id ? 'border-amber-500 bg-amber-500/10 text-gold' : 'border-line bg-card hover:border-amber-500/50'}`}
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
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${region === r.id ? 'border-amber-500 bg-amber-500/10' : 'border-line bg-card hover:border-amber-500/50'}`}
                >
                  <MapPin size={18} className={region === r.id ? 'text-gold' : 'text-muted'} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{r.name}</div>
                    <div className="truncate text-xs text-muted">{r.description}</div>
                  </div>
                </button>
              ))}
            </div>
            {region && (
              <div>
                <span className="mb-1.5 block text-sm font-bold">המועדון הראשון שלך</span>
                <div className="space-y-2">
                  {getRegion(region).clubs[sport].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setClub(c.name)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${club === c.name ? 'border-amber-500 bg-amber-500/10' : 'border-line bg-card hover:border-amber-500/50'}`}
                    >
                      <Shield size={18} className={club === c.name ? 'text-gold' : 'text-muted'} />
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
              <Briefcase size={18} className="mt-0.5 shrink-0 text-gold" />
              <p>בליגות הנמוכות אף אחד לא חי מ{sport ? SPORT_LABEL[sport] : 'ספורט'}. עבודה מכניסה כסף אבל שורפת אנרגיה. היא תתבטל לבד כשתחתום על חוזה מקצועני מלא.</p>
            </div>
            <JobPicker selected={jobId} onPick={setJobId} />
          </div>
        )}
      </main>

      <footer className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 rounded-2xl border border-line bg-card px-4 py-3.5 font-bold text-muted hover:text-white"
          >
            <ChevronRight size={18} />
            חזרה
          </button>
        )}
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
