import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ScenePhoto } from './art/ScenePhoto';

const SLIDES = [
  { scene: 'intro_1', text: 'כל קריירה מתחילה על ספסל עץ, במגרש שכונתי, כשאף אחד עוד לא יודע איך קוראים לך.' },
  { scene: 'intro_2', text: 'בבוקר עבודה. בערב אימון. בשבת משחק בליגה ג׳, מול שלושים אוהדים וכלב אחד.' },
  { scene: 'intro_3', text: 'מכאן אפשר להגיע לליגת העל, לסרט הקפטן ולמדי הנבחרת. הדרך שלך מתחילה עכשיו.' },
];

/** Short cinematic intro before creating a new career. Tap to advance, "דלג" to skip. */
export function IntroStory({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : onDone());
  return (
    <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden bg-black" onClick={next} role="button" aria-label="המשך">
      <div key={i} className="animate-sheet absolute inset-0">
        <ScenePhoto scene={slide.scene} sport="football" height="100dvh" fade={false} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex items-center gap-0.5 rounded-full bg-black/35 px-3 py-1.5 text-sm font-bold text-white/85 backdrop-blur"
      >
        דלג
        <ChevronLeft size={16} />
      </button>
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <p key={`t${i}`} className="animate-sheet text-2xl font-black leading-snug text-white drop-shadow-lg">
          {slide.text}
        </p>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {SLIDES.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-8 bg-brand' : 'w-3 bg-white/35'}`} />
            ))}
          </div>
          <span className="text-xs text-white/60">הקישו להמשך</span>
        </div>
      </div>
    </div>
  );
}
