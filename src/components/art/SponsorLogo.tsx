import { Car, Droplets, Landmark, Pizza, Shirt, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Sponsor, SponsorCategory } from '../../data/sponsors';

const ICONS: Record<SponsorCategory, LucideIcon> = {
  food: Pizza,
  drink: Droplets,
  apparel: Shirt,
  telecom: Smartphone,
  finance: Landmark,
  auto: Car,
};

/** Wordmark-style badge for a (fictional) sponsor brand. */
export function SponsorLogo({ sponsor, size = 'md' }: { sponsor: Sponsor; size?: 'sm' | 'md' }) {
  const Icon = ICONS[sponsor.category];
  const small = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-black text-white shadow-sm ${small ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-sm'}`}
      style={{ background: `linear-gradient(135deg, ${sponsor.color}, ${sponsor.color}cc)` }}
    >
      <span className={`flex items-center justify-center rounded-full bg-white/25 ${small ? 'h-4 w-4' : 'h-5 w-5'}`}>
        <Icon size={small ? 10 : 12} />
      </span>
      {sponsor.name}
    </span>
  );
}
