import { ChartColumn, House, Newspaper, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ViewId = 'home' | 'table' | 'news' | 'career';

const ITEMS: { id: ViewId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'ראשי', icon: House },
  { id: 'table', label: 'טבלה', icon: ChartColumn },
  { id: 'news', label: 'חדשות', icon: Newspaper },
  { id: 'career', label: 'קריירה', icon: UserRound },
];

export function BottomNav({ view, onChange }: { view: ViewId; onChange: (v: ViewId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-pitch/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition ${active ? 'text-brand' : 'text-muted hover:text-ink'}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
