import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'gold' | 'ghost';
}

export function GoldButton({ children, variant = 'gold', className = '', ...rest }: GoldButtonProps) {
  const base =
    variant === 'gold'
      ? 'bg-brand hover:bg-brand-600 text-white font-bold disabled:bg-slate-200 disabled:text-slate-400'
      : 'bg-card border border-line text-ink hover:border-brand/50 font-semibold disabled:opacity-40';
  return (
    <button
      {...rest}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base transition active:scale-[0.99] ${base} ${className}`}
    >
      {children}
    </button>
  );
}
