import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'gold' | 'ghost';
}

export function GoldButton({ children, variant = 'gold', className = '', ...rest }: GoldButtonProps) {
  const base =
    variant === 'gold'
      ? 'btn-gold font-black'
      : 'bg-card border border-line text-ink hover:border-brand/50 font-semibold disabled:opacity-40';
  return (
    <button
      {...rest}
      className={`flex w-full items-center justify-center gap-2 ${variant === 'gold' ? 'rounded-md' : 'rounded-2xl'} px-4 py-3.5 text-base transition active:scale-[0.99] ${base} ${className}`}
    >
      {children}
    </button>
  );
}
