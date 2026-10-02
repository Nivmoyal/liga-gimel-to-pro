import { ChevronRight, ImageOff } from 'lucide-react';
import { allPhotoCredits } from '../data/photos';
import { allRemotePhotos } from '../services/photoService';

/** Attribution for every installed photo (required by CC BY / BY-SA licenses). */
export function CreditsScreen({ onBack }: { onBack: () => void }) {
  const credits = [
    ...allPhotoCredits(),
    ...allRemotePhotos().map((p) => ({ file: p.url, title: p.title, author: p.author, license: p.license, licenseUrl: undefined, source: p.page })),
  ];
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
        <ChevronRight size={18} />
        חזרה
      </button>
      <h1 className="gold-text mb-1 text-3xl font-black">קרדיטים לתמונות</h1>
      <p className="mb-4 text-sm text-muted">התמונות מגיעות מ-Wikimedia Commons ברישיונות חופשיים (CC0, CC BY, CC BY-SA, נחלת הכלל), עם קרדיט לצלמים.</p>
      {credits.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          <ImageOff size={18} />
          התמונות עוד נטענות. הן יופיעו כאן אחרי שייטענו במשחק.
        </div>
      ) : (
        <ul className="space-y-2">
          {credits.map((c) => (
            <li key={c.file} className="rounded-xl border border-line bg-card p-3 text-sm">
              <div className="font-bold" dir="auto">
                {c.title || c.file}
              </div>
              <div className="text-xs text-muted" dir="auto">
                {c.author ? `${c.author} | ` : ''}
                {c.licenseUrl ? (
                  <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="underline">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}
                {c.source && (
                  <>
                    {' | '}
                    <a href={c.source} target="_blank" rel="noreferrer" className="underline">
                      מקור
                    </a>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
