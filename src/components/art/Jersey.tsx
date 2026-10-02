import { useId } from 'react';
import type { SportType } from '../../types/game';
import { readableOn } from '../../data/clubIdentity';

interface JerseyProps {
  primary: string;
  secondary: string;
  name: string;
  number: number | string;
  sport: SportType;
  sponsor?: string;
  captain?: boolean;
  width?: number;
  className?: string;
}

const FOOTBALL = 'M62 18 Q100 34 138 18 L184 42 L168 92 L148 84 L148 204 Q100 212 52 204 L52 84 L32 92 L16 42 Z';
const BASKETBALL = 'M66 14 Q100 42 134 14 L150 17 Q147 62 166 78 L162 205 Q100 214 38 205 L34 78 Q53 62 50 17 Z';

/** Back view of the player's shirt with name and number, in club colors. */
export function Jersey({ primary, secondary, name, number, sport, sponsor, captain, width = 180, className }: JerseyProps) {
  const id = useId().replace(/:/g, '');
  const text = primary.toLowerCase() === '#ffffff' ? secondary : readableOn(primary);
  const outline = primary.toLowerCase() === '#ffffff' ? secondary : '#13233a';
  const surname = (name.trim().split(/\s+/).pop() || name || 'שחקן').slice(0, 14);
  const nameSize = Math.min(24, 150 / Math.max(1, surname.length * 0.62));
  const path = sport === 'football' ? FOOTBALL : BASKETBALL;
  return (
    <svg viewBox="0 0 200 230" width={width} height={(width * 230) / 200} className={className} role="img" aria-label={`חולצה ${surname} ${number}`}>
      <defs>
        <clipPath id={`j${id}`}>
          <path d={path} />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="218" rx="70" ry="7" fill="#13233a" opacity="0.12" />
      <g clipPath={`url(#j${id})`}>
        <rect width="200" height="230" fill={primary} />
        {/* side panels */}
        <rect x="40" y="90" width="14" height="130" fill={secondary} opacity="0.9" />
        <rect x="146" y="90" width="14" height="130" fill={secondary} opacity="0.9" />
        <rect width="200" height="230" fill={`url(#g${id})`} />
      </g>
      {sport === 'football' ? (
        <>
          <path d="M62 18 Q100 34 138 18 Q100 46 62 18Z" fill={secondary} />
          <line x1="16" y1="42" x2="32" y2="92" stroke={secondary} strokeWidth="9" strokeLinecap="round" />
          <line x1="184" y1="42" x2="168" y2="92" stroke={secondary} strokeWidth="9" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M66 14 Q100 42 134 14" fill="none" stroke={secondary} strokeWidth="7" />
          <path d="M50 17 Q53 62 34 78" fill="none" stroke={secondary} strokeWidth="7" />
          <path d="M150 17 Q147 62 166 78" fill="none" stroke={secondary} strokeWidth="7" />
        </>
      )}
      <path d={path} fill="none" stroke={outline} strokeOpacity="0.55" strokeWidth="2.5" strokeLinejoin="round" />
      <text x="100" y="74" textAnchor="middle" fontSize={nameSize} fontWeight="900" fill={text} fontFamily="Heebo, system-ui, sans-serif">
        {surname}
      </text>
      <text
        x="100"
        y="160"
        textAnchor="middle"
        fontSize="82"
        fontWeight="900"
        fill={text}
        stroke={secondary}
        strokeWidth="3"
        paintOrder="stroke"
        fontFamily="Heebo, system-ui, sans-serif"
      >
        {number}
      </text>
      {captain && (
        <g transform={sport === 'football' ? 'rotate(-18 40 64)' : 'rotate(-12 44 60)'}>
          <rect x={sport === 'football' ? 22 : 30} y="56" width="34" height="15" rx="2" fill="#e3b24c" stroke="#120d02" strokeOpacity="0.5" />
          <text x={sport === 'football' ? 39 : 47} y="68" textAnchor="middle" fontSize="12" fontWeight="900" fill="#120d02" fontFamily="Heebo, sans-serif">
            C
          </text>
        </g>
      )}
      {sponsor && (
        <text x="100" y="192" textAnchor="middle" fontSize="11" fontWeight="700" fill={text} opacity="0.85" fontFamily="Heebo, system-ui, sans-serif">
          {sponsor}
        </text>
      )}
    </svg>
  );
}
