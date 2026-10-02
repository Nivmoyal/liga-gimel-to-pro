import { useState } from 'react';
import { Building, Flame, Megaphone, Newspaper, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { NewsCategory, NewsItem } from '../types/game';

type Filter = 'all' | NewsCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'הכל' },
  { id: 'club', label: 'המועדון' },
  { id: 'rumors', label: 'שמועות' },
  { id: 'league', label: 'הליגה' },
  { id: 'fans', label: 'אוהדים' },
];

const CATEGORY_META: Record<NewsCategory, { icon: LucideIcon; label: string; color: string }> = {
  club: { icon: Building, label: 'המועדון', color: 'text-sky-400 bg-sky-500/10' },
  rumors: { icon: Flame, label: 'שמועות', color: 'text-orange-400 bg-orange-500/10' },
  league: { icon: Megaphone, label: 'הליגה', color: 'text-emerald-400 bg-emerald-500/10' },
  fans: { icon: Users, label: 'אוהדים', color: 'text-fuchsia-400 bg-fuchsia-500/10' },
};

interface SocialFeedProps {
  news: NewsItem[];
  limit?: number;
  title?: string;
}

/** "מה מדברים עליכם" - filterable news and social feed. */
export function SocialFeed({ news, limit, title = 'מה מדברים עליכם' }: SocialFeedProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = news.filter((n) => filter === 'all' || n.category === filter);
  const shown = limit ? filtered.slice(0, limit) : filtered;

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Newspaper size={18} className="text-gold" />
        <h2 className="font-extrabold">{title}</h2>
      </div>
      <div className="scrollbar-none -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              filter === f.id ? 'bg-amber-500 text-black' : 'border border-line bg-pitch text-muted hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">אין עדיין כותרות בקטגוריה הזו.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => {
            const meta = CATEGORY_META[item.category];
            const Icon = meta.icon;
            return (
              <li key={item.id} className="flex gap-3 rounded-xl bg-pitch/60 p-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{item.text}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {meta.label} | עונה {item.season}
                    {item.matchday > 0 ? ` | מחזור ${item.matchday}` : ' | פתיחת עונה'}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
