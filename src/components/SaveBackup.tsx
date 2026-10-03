import { useState } from 'react';
import { ClipboardCopy, Download, Upload } from 'lucide-react';
import type { GameState } from '../types/game';
import { exportSave, importSave } from '../state/storage';

/** Copy the career out as a text code (to keep it safe or move it to another device). */
export function SaveExport({ state }: { state: GameState }) {
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const make = async () => {
    setCode(await exportSave(state));
    setNote('');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setNote('הקוד הועתק. שמרו אותו בהודעה לעצמכם או בפתקים.');
    } catch {
      setNote('לא הצלחנו להעתיק אוטומטית. סמנו את הקוד והעתיקו אותו ידנית.');
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">הקריירה נשמרת בדפדפן הזה. כדי לא לאבד אותה, או כדי להמשיך במכשיר אחר, צרו קוד גיבוי.</p>
      {!code ? (
        <button onClick={make} className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-card-2 py-2.5 font-bold hover:border-brand/50">
          <Download size={16} />
          ליצור קוד גיבוי
        </button>
      ) : (
        <>
          <textarea readOnly value={code} onFocus={(e) => e.currentTarget.select()} className="h-20 w-full resize-none rounded-xl border border-line bg-pitch p-2 font-mono text-[10px] text-muted" dir="ltr" />
          <button onClick={copy} className="btn-gold flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-black">
            <ClipboardCopy size={15} />
            להעתיק את הקוד
          </button>
        </>
      )}
      {note && <p className="text-xs text-amber-200">{note}</p>}
    </div>
  );
}

/** Paste a backup code to load a career. */
export function SaveImport({ onLoad }: { onLoad: (state: GameState) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    const state = await importSave(code);
    if (!state) {
      setError('הקוד לא תקין. ודאו שהעתקתם אותו במלואו.');
      return;
    }
    onLoad(state);
  };
  return (
    <div className="space-y-2">
      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError('');
        }}
        placeholder="הדביקו כאן את קוד הגיבוי"
        className="h-20 w-full resize-none rounded-xl border border-line bg-black/50 p-2 font-mono text-[11px] text-white placeholder:text-white/50"
        dir="ltr"
      />
      <button onClick={load} disabled={!code.trim()} className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-black disabled:opacity-40">
        <Upload size={16} />
        לטעון את הקריירה
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
