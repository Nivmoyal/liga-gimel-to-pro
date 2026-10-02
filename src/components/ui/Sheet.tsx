import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

interface SheetProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Mobile bottom sheet used for actions and match phases. */
export function Sheet({ title, subtitle, icon: Icon, onClose, children, footer }: SheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="animate-sheet flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl border border-b-0 border-line bg-pitch shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-gold">
              <Icon size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-extrabold">{title}</h2>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-full p-2 text-muted hover:bg-card hover:text-white" aria-label="סגירה">
              <X size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
