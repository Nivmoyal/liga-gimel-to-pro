import { useId } from 'react';
import { clubIdentity, readableOn } from '../../data/clubIdentity';
import { NATIONAL_OPPONENTS } from '../../data/national';

const SHAPES = {
  shield: 'M20 2 L37 7 V22 C37 34 29 41 20 44 C11 41 3 34 3 22 V7 Z',
  crest: 'M4 10 Q20 0 36 10 V26 C36 36 28 41 20 44 C12 41 4 36 4 26 Z',
  round: 'M20 4 A19 19 0 0 1 20 42 A19 19 0 0 1 20 4 Z',
} as const;

interface CrestProps {
  name: string;
  size?: number;
  className?: string;
}

/** Procedural club crest: club colors, pattern and Hebrew abbreviation. */
export function Crest({ name, size = 32, className }: CrestProps) {
  const id = useId().replace(/:/g, '');
  const national = NATIONAL_OPPONENTS.football.concat(NATIONAL_OPPONENTS.basketball).find((n) => n.name === name);
  if (name === 'ישראל' || name.startsWith('נבחרת ישראל')) return <IsraelCrest size={size} className={className} />;
  if (national) return <CountryCrest name={name} colors={national.colors} size={size} className={className} />;

  const { colors, abbr, pattern, shape } = clubIdentity(name);
  const path = SHAPES[shape];
  // Abbreviation sits on a white badge: use the club's darker color for it.
  const primaryIsLight = readableOn(colors.primary) !== '#ffffff';
  const badgeText = !primaryIsLight ? colors.primary : readableOn(colors.secondary) === '#ffffff' ? colors.secondary : '#13233a';
  return (
    <svg viewBox="0 0 40 46" width={size} height={(size * 46) / 40} className={className} role="img" aria-label={`סמל ${name}`}>
      <defs>
        <clipPath id={`c${id}`}>
          <path d={path} />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="40" height="46" fill={colors.primary} />
        {pattern === 'halves' && <rect x="20" width="20" height="46" fill={colors.secondary} />}
        {pattern === 'stripe' && <polygon points="0,30 0,40 40,10 40,0" fill={colors.secondary} />}
        {pattern === 'band' && <rect y="17" width="40" height="11" fill={colors.secondary} />}
        {pattern === 'solid' && <rect y="36" width="40" height="10" fill={colors.secondary} />}
      </g>
      <path d={path} fill="none" stroke="#13233a" strokeOpacity="0.85" strokeWidth="1.6" />
      <circle cx="20" cy="23" r="9.5" fill="#ffffff" stroke={badgeText} strokeWidth="1.6" />
      <text
        x="20"
        y="26.6"
        textAnchor="middle"
        fontSize={abbr.length > 3 ? 7 : 9.5}
        fontWeight="900"
        fill={badgeText}
        fontFamily="Heebo, system-ui, sans-serif"
      >
        {abbr}
      </text>
    </svg>
  );
}

export function StarOfDavid({ cx, cy, r, stroke, width = 1.6 }: { cx: number; cy: number; r: number; stroke: string; width?: number }) {
  const tri = (rot: number) =>
    [0, 1, 2]
      .map((i) => {
        const a = ((rot + i * 120 - 90) * Math.PI) / 180;
        return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
      })
      .join(' ');
  return (
    <g fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round">
      <polygon points={tri(0)} />
      <polygon points={tri(180)} />
    </g>
  );
}

function IsraelCrest({ size, className }: { size: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 46" width={size} height={(size * 46) / 40} className={className} role="img" aria-label="סמל נבחרת ישראל">
      <defs>
        <clipPath id={`i${id}`}>
          <path d={SHAPES.shield} />
        </clipPath>
      </defs>
      <g clipPath={`url(#i${id})`}>
        <rect width="40" height="46" fill="#ffffff" />
        <rect y="7" width="40" height="4" fill="#0038b8" />
        <rect y="35" width="40" height="4" fill="#0038b8" />
      </g>
      <StarOfDavid cx={20} cy={23} r={8} stroke="#0038b8" width={2} />
      <path d={SHAPES.shield} fill="none" stroke="#0038b8" strokeWidth="1.8" />
    </svg>
  );
}

function CountryCrest({ name, colors, size, className }: { name: string; colors: [string, string]; size: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 40 46" width={size} height={(size * 46) / 40} className={className} role="img" aria-label={`סמל ${name}`}>
      <defs>
        <clipPath id={`k${id}`}>
          <path d={SHAPES.round} />
        </clipPath>
      </defs>
      <g clipPath={`url(#k${id})`}>
        <rect width="40" height="46" fill={colors[0]} />
        <rect y="23" width="40" height="23" fill={colors[1]} />
      </g>
      <path d={SHAPES.round} fill="none" stroke="#13233a" strokeOpacity="0.8" strokeWidth="1.6" />
      <circle cx="20" cy="22" r="8.5" fill="#ffffff" />
      <text x="20" y="26" textAnchor="middle" fontSize="10" fontWeight="900" fill="#13233a" fontFamily="Heebo, system-ui, sans-serif">
        {name[0]}
      </text>
    </svg>
  );
}
