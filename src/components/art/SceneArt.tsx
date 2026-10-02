// ===================================================================
// SceneArt: flat vector illustrations for every situation in the game.
// Built from a small kit (backgrounds, posed player figures, props) and
// tinted with the real club colors of both teams. No bitmaps, no emoji.
// ===================================================================

import { useId } from 'react';
import type { ReactNode } from 'react';
import type { SportType } from '../../types/game';
import { readableOn } from '../../data/clubIdentity';
import { StarOfDavid } from './Crest';

export interface TeamPaint {
  shirt: string;
  shorts: string;
}

interface SceneArtProps {
  scene: string;
  sport: SportType;
  team: TeamPaint;
  opp?: TeamPaint;
  number?: number;
  label?: string;
  className?: string;
  height?: number;
}

const W = 360;
const H = 170;
const SKIN = ['#f1c27d', '#c68642', '#e0ac69', '#8d5524', '#ffdbac', '#d29a6a'];
const INK = '#13233a';
const KEEPER: TeamPaint = { shirt: '#a3e635', shorts: '#14532d' };
const STAFF: TeamPaint = { shirt: '#334155', shorts: '#1e293b' };
const NEUTRAL_OPP: TeamPaint = { shirt: '#64748b', shorts: '#334155' };

// ------------------------------------------------------------------
// Figure
// ------------------------------------------------------------------

type Pose = 'stand' | 'run' | 'kick' | 'jump' | 'shoot' | 'keeper' | 'wall' | 'point' | 'cheer' | 'dribble' | 'slide' | 'block' | 'lift';

const POSES: Record<Pose, { la: [number, number]; ra: [number, number]; ll: [number, number]; rl: [number, number]; lean?: number }> = {
  stand: { la: [-8, -16], ra: [8, -16], ll: [-4, 0], rl: [4, 0] },
  run: { la: [-9, -24], ra: [9, -17], ll: [-9, -2], rl: [8, -5], lean: 10 },
  kick: { la: [-11, -26], ra: [10, -27], ll: [-3, 0], rl: [13, -9], lean: -6 },
  jump: { la: [-6, -45], ra: [7, -45], ll: [-5, -4], rl: [5, -6] },
  shoot: { la: [-2, -46], ra: [4, -48], ll: [-4, 0], rl: [4, 0] },
  keeper: { la: [-16, -34], ra: [16, -34], ll: [-8, 0], rl: [8, 0] },
  wall: { la: [-3, -14], ra: [3, -14], ll: [-3, 0], rl: [3, 0] },
  point: { la: [-8, -16], ra: [15, -33], ll: [-4, 0], rl: [4, 0] },
  cheer: { la: [-11, -45], ra: [11, -45], ll: [-4, 0], rl: [4, 0] },
  dribble: { la: [-9, -24], ra: [11, -11], ll: [-8, -2], rl: [7, -5], lean: 8 },
  slide: { la: [-12, -20], ra: [6, -30], ll: [-4, 0], rl: [14, -2], lean: -55 },
  block: { la: [-4, -50], ra: [8, -49], ll: [-5, -3], rl: [5, -6] },
  lift: { la: [-12, -40], ra: [12, -40], ll: [-6, 0], rl: [6, 0] },
};

interface FigureProps {
  x: number;
  y: number;
  s?: number;
  paint: TeamPaint;
  pose?: Pose;
  flip?: boolean;
  skin?: number;
  num?: number | string;
  raise?: number;
}

function Figure({ x, y, s = 1, paint, pose = 'stand', flip = false, skin = 0, num, raise = 0 }: FigureProps) {
  const p = POSES[pose];
  const sk = SKIN[skin % SKIN.length];
  const limb = { stroke: sk, strokeWidth: 3.4, strokeLinecap: 'round' as const };
  const numColor = readableOn(paint.shirt);
  return (
    <g transform={`translate(${x},${y - raise}) scale(${flip ? -s : s},${s}) rotate(${p.lean ?? 0})`}>
      <ellipse cx="0" cy={raise / s + 1} rx="9" ry="2.2" fill={INK} opacity="0.15" />
      <line x1="-3" y1="-12" x2={p.ll[0]} y2={p.ll[1]} {...limb} />
      <line x1="3" y1="-12" x2={p.rl[0]} y2={p.rl[1]} {...limb} />
      <circle cx={p.ll[0]} cy={p.ll[1]} r="2.2" fill={INK} />
      <circle cx={p.rl[0]} cy={p.rl[1]} r="2.2" fill={INK} />
      <rect x="-6.5" y="-18" width="13" height="7" rx="2" fill={paint.shorts} />
      <line x1="-5" y1="-27" x2={p.la[0]} y2={p.la[1]} {...limb} />
      <line x1="5" y1="-27" x2={p.ra[0]} y2={p.ra[1]} {...limb} />
      <rect x="-7" y="-31" width="14" height="15" rx="4.5" fill={paint.shirt} stroke={INK} strokeOpacity="0.15" />
      {num !== undefined && (
        <text x="0" y="-19.5" textAnchor="middle" fontSize="7.5" fontWeight="900" fill={numColor} fontFamily="Heebo, sans-serif" transform={flip ? 'scale(-1,1)' : undefined}>
          {num}
        </text>
      )}
      <circle cx="0" cy="-36.5" r="5.4" fill={sk} />
      <path d="M-5.4,-37.5 a5.4,5.4 0 0 1 10.8,0 q-5.4,-2.6 -10.8,0z" fill={INK} opacity="0.85" />
    </g>
  );
}

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------

function Ball({ x, y, r = 4.5, sport }: { x: number; y: number; r?: number; sport: SportType }) {
  if (sport === 'basketball') {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#f08a24" stroke="#8a3d07" strokeWidth="0.8" />
        <path d={`M${x - r},${y} H${x + r} M${x},${y - r} V${y + r}`} stroke="#8a3d07" strokeWidth="0.7" />
        <path d={`M${x - r * 0.7},${y - r * 0.7} Q${x},${y} ${x - r * 0.7},${y + r * 0.7} M${x + r * 0.7},${y - r * 0.7} Q${x},${y} ${x + r * 0.7},${y + r * 0.7}`} stroke="#8a3d07" strokeWidth="0.7" fill="none" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#ffffff" stroke={INK} strokeWidth="0.8" />
      <polygon
        points={[0, 1, 2, 3, 4].map((i) => `${x + r * 0.45 * Math.cos((i * 72 - 90) * (Math.PI / 180))},${y + r * 0.45 * Math.sin((i * 72 - 90) * (Math.PI / 180))}`).join(' ')}
        fill={INK}
      />
    </g>
  );
}

function Goal({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const lines: ReactNode[] = [];
  for (let i = 1; i < 10; i++) lines.push(<line key={`v${i}`} x1={x + (w * i) / 10} y1={y} x2={x + (w * i) / 10} y2={y + h} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.6" />);
  for (let i = 1; i < 5; i++) lines.push(<line key={`h${i}`} x1={x} y1={y + (h * i) / 5} x2={x + w} y2={y + (h * i) / 5} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.6" />);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#dbeafe" opacity="0.35" />
      {lines}
      <path d={`M${x},${y + h} V${y} H${x + w} V${y + h}`} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
    </g>
  );
}

function Hoop({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x="-3" y="-60" width="6" height="40" fill="#94a3b8" />
      <rect x="-26" y="-34" width="52" height="32" rx="2" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="-10" y="-22" width="20" height="14" fill="none" stroke="#ef4444" strokeWidth="1.5" />
      <ellipse cx="0" cy="-2" rx="11" ry="3" fill="none" stroke="#f97316" strokeWidth="2.2" />
      <path d="M-11,-2 L-7,12 M-4,-1 L-3,13 M4,-1 L3,13 M11,-2 L7,12 M-7,12 H7 M-9,5 H9" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
    </g>
  );
}

function Crowd({ y, rows = 3, colors }: { y: number; rows?: number; colors: string[] }) {
  const heads: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < 36; i++) {
      const cx = i * 10.4 + (r % 2 ? 5 : 0);
      const cy = y + r * 9;
      const c = colors[(i * 7 + r * 3) % colors.length];
      heads.push(
        <g key={`${r}-${i}`}>
          <rect x={cx - 3.5} y={cy + 2} width="7" height="6" rx="2" fill={c} />
          <circle cx={cx} cy={cy} r="2.8" fill={SKIN[(i + r) % SKIN.length]} />
        </g>,
      );
    }
  }
  return <g>{heads}</g>;
}

function Floodlight({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 46} stroke="#94a3b8" strokeWidth="2" />
      <rect x={x - 9} y={y - 6} width="18" height="8" rx="1.5" fill="#e2e8f0" stroke="#94a3b8" />
      <circle cx={x - 4} cy={y - 2} r="1.8" fill="#fff7cc" />
      <circle cx={x + 4} cy={y - 2} r="1.8" fill="#fff7cc" />
      <polygon points={`${x - 9},${y} ${x + 9},${y} ${x + 40},${y + 70} ${x - 40},${y + 70}`} fill="#fffbe6" opacity="0.18" />
    </g>
  );
}

function Arrow({ d, color = '#ffffff' }: { d: string; color?: string }) {
  return <path d={d} fill="none" stroke={color} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity="0.9" />;
}

function MotionLines({ x, y, color = '#ffffff' }: { x: number; y: number; color?: string }) {
  return (
    <g stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
      <line x1={x} y1={y} x2={x + 14} y2={y} />
      <line x1={x + 4} y1={y + 6} x2={x + 16} y2={y + 6} />
      <line x1={x} y1={y + 12} x2={x + 12} y2={y + 12} />
    </g>
  );
}

// ------------------------------------------------------------------
// Backgrounds
// ------------------------------------------------------------------

function SkyGradient({ id, top = '#9fd3ff', bottom = '#e9f5ff' }: { id: string; top?: string; bottom?: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={top} />
      <stop offset="1" stopColor={bottom} />
    </linearGradient>
  );
}

function PitchBg({ uid, variant, crowd }: { uid: string; variant: 'goal' | 'wide'; crowd: string[] }) {
  const stripes: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    stripes.push(<rect key={i} x={i * 45} y="52" width="45" height="118" fill={i % 2 ? '#4fb862' : '#5cc56f'} />);
  }
  return (
    <g>
      <rect width={W} height={H} fill={`url(#sky${uid})`} />
      <rect y="18" width={W} height="34" fill="#cbd5e1" />
      <Crowd y={22} rows={3} colors={crowd} />
      <rect y="48" width={W} height="5" fill="#2f6bff" opacity="0.85" />
      {stripes}
      {variant === 'goal' ? (
        <g stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.9">
          <polygon points="60,58 300,58 340,150 20,150" />
          <polygon points="128,58 232,58 246,86 114,86" />
          <path d="M146,150 Q180,128 214,150" />
          <circle cx="180" cy="118" r="1.8" fill="#ffffff" />
        </g>
      ) : (
        <g stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.85">
          <line x1="0" y1="62" x2={W} y2="62" />
          <line x1="180" y1="62" x2="180" y2="170" />
          <ellipse cx="180" cy="122" rx="46" ry="20" />
        </g>
      )}
    </g>
  );
}

function CourtBg({ uid, paint, crowd }: { uid: string; paint: string; crowd: string[] }) {
  const planks: ReactNode[] = [];
  for (let i = 0; i < 12; i++) planks.push(<line key={i} x1="0" y1={78 + i * 8} x2={W} y2={78 + i * 8} stroke="#d99a55" strokeOpacity="0.45" />);
  return (
    <g>
      <rect width={W} height={H} fill={`url(#wall${uid})`} />
      <rect y="10" width={W} height="38" fill="#cbd5e1" />
      <Crowd y={14} rows={3} colors={crowd} />
      <rect y="46" width={W} height="26" fill="#e2e8f0" />
      <rect y="72" width={W} height="98" fill="#f0bf82" />
      {planks}
      <polygon points="140,78 220,78 238,150 122,150" fill={paint} opacity="0.35" />
      <g stroke="#ffffff" strokeWidth="1.8" fill="none">
        <polygon points="140,78 220,78 238,150 122,150" />
        <path d="M60,78 Q60,165 180,165 Q300,165 300,78" />
        <ellipse cx="180" cy="150" rx="22" ry="7" />
      </g>
    </g>
  );
}

function RoomBg({ uid, wall = '#dbe7f7', floor = '#c7d2e0' }: { uid: string; wall?: string; floor?: string }) {
  return (
    <g>
      <rect width={W} height={H} fill={wall} />
      <rect width={W} height={H} fill={`url(#shade${uid})`} />
      <rect y="128" width={W} height="42" fill={floor} />
      <line x1="0" y1="128" x2={W} y2="128" stroke={INK} strokeOpacity="0.1" strokeWidth="2" />
    </g>
  );
}

function Skyline({ y, color = '#a5b8d6' }: { y: number; color?: string }) {
  const b = [
    [10, 40], [40, 62], [70, 34], [96, 74], [130, 46], [158, 58], [190, 82], [222, 40], [250, 66], [282, 50], [310, 72], [338, 38],
  ];
  return (
    <g fill={color}>
      {b.map(([x, h], i) => (
        <g key={i}>
          <rect x={x} y={y - h} width="26" height={h} rx="2" />
          {[0, 1, 2].map((r) => (
            <rect key={r} x={x + 5} y={y - h + 6 + r * 12} width="5" height="5" fill="#fef3c7" opacity="0.8" />
          ))}
        </g>
      ))}
    </g>
  );
}

function IsraelFlag({ x, y, w }: { x: number; y: number; w: number }) {
  const h = w * 0.72;
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + h + 40} stroke="#94a3b8" strokeWidth="2.5" />
      <path d={`M${x},${y} Q${x + w / 2},${y - 6} ${x + w},${y} V${y + h} Q${x + w / 2},${y + h - 6} ${x},${y + h} Z`} fill="#ffffff" stroke="#cbd5e1" />
      <rect x={x + 1} y={y + h * 0.12} width={w - 2} height={h * 0.13} fill="#0038b8" />
      <rect x={x + 1} y={y + h * 0.75} width={w - 2} height={h * 0.13} fill="#0038b8" />
      <StarOfDavid cx={x + w / 2} cy={y + h / 2} r={h * 0.2} stroke="#0038b8" width={2} />
    </g>
  );
}

// ------------------------------------------------------------------
// Scenes
// ------------------------------------------------------------------

interface Ctx {
  uid: string;
  sport: SportType;
  team: TeamPaint;
  opp: TeamPaint;
  num?: number;
  crowd: string[];
  label?: string;
}

function sportField(c: Ctx, variant: 'goal' | 'wide' = 'wide') {
  return c.sport === 'football' ? <PitchBg uid={c.uid} variant={variant} crowd={c.crowd} /> : <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />;
}

const SCENES: Record<string, (c: Ctx) => ReactNode> = {
  // ---------------- football ----------------
  fb_1v1: (c) => (
    <>
      <PitchBg uid={c.uid} variant="goal" crowd={c.crowd} />
      <Goal x={130} y={44} w={100} h={38} />
      <Figure x={185} y={96} s={1.15} paint={KEEPER} pose="keeper" skin={3} />
      <Figure x={110} y={160} s={1.45} paint={c.opp} pose="run" skin={1} />
      <Figure x={180} y={158} s={1.6} paint={c.team} pose="run" num={c.num} flip />
      <Ball x={196} y={158} r={5} sport="football" />
      <MotionLines x={210} y={128} />
    </>
  ),
  fb_penalty: (c) => (
    <>
      <PitchBg uid={c.uid} variant="goal" crowd={c.crowd} />
      <Goal x={122} y={40} w={116} h={44} />
      <Figure x={180} y={98} s={1.2} paint={KEEPER} pose="keeper" skin={2} />
      <Ball x={180} y={124} r={4.6} sport="football" />
      <Figure x={208} y={164} s={1.75} paint={c.team} pose="stand" num={c.num} />
    </>
  ),
  fb_freekick: (c) => (
    <>
      <PitchBg uid={c.uid} variant="goal" crowd={c.crowd} />
      <Goal x={136} y={44} w={88} h={34} />
      <Figure x={175} y={86} s={0.95} paint={KEEPER} pose="keeper" skin={4} />
      {[0, 1, 2, 3].map((i) => (
        <Figure key={i} x={150 + i * 15} y={118} s={1.05} paint={c.opp} pose="wall" skin={i} />
      ))}
      <Ball x={186} y={150} r={4.6} sport="football" />
      <Figure x={218} y={164} s={1.6} paint={c.team} pose="run" num={c.num} flip />
      <Arrow d="M186,146 Q150,70 196,60" />
    </>
  ),
  fb_header: (c) => (
    <>
      <PitchBg uid={c.uid} variant="goal" crowd={c.crowd} />
      <Goal x={130} y={44} w={100} h={38} />
      <Figure x={162} y={150} s={1.55} paint={c.team} pose="jump" raise={22} num={c.num} />
      <Figure x={196} y={152} s={1.55} paint={c.opp} pose="jump" raise={14} skin={3} flip />
      <Ball x={168} y={70} r={5} sport="football" />
      <Arrow d="M40,70 Q100,30 162,66" />
    </>
  ),
  fb_cross: (c) => (
    <>
      <PitchBg uid={c.uid} variant="wide" crowd={c.crowd} />
      <Figure x={300} y={150} s={1.55} paint={c.team} pose="kick" num={c.num} flip />
      <Ball x={282} y={148} r={4.6} sport="football" />
      <Figure x={150} y={120} s={1.2} paint={c.team} pose="run" skin={2} />
      <Figure x={112} y={128} s={1.2} paint={c.team} pose="run" skin={4} />
      <Figure x={130} y={112} s={1.1} paint={c.opp} pose="stand" skin={1} />
      <Figure x={90} y={114} s={1.1} paint={c.opp} pose="stand" skin={3} />
      <Arrow d="M282,140 Q220,40 140,84" />
    </>
  ),
  fb_tackle: (c) => (
    <>
      <PitchBg uid={c.uid} variant="wide" crowd={c.crowd} />
      <Figure x={200} y={150} s={1.6} paint={c.opp} pose="dribble" skin={1} flip />
      <Ball x={176} y={152} r={4.8} sport="football" />
      <Figure x={150} y={160} s={1.55} paint={c.team} pose="slide" num={c.num} />
      <g fill="#86efac" opacity="0.8">
        <circle cx="130" cy="160" r="1.6" />
        <circle cx="122" cy="156" r="1.2" />
        <circle cx="138" cy="164" r="1.4" />
      </g>
      <MotionLines x={226} y={118} />
    </>
  ),
  fb_counter: (c) => (
    <>
      <PitchBg uid={c.uid} variant="wide" crowd={c.crowd} />
      <Figure x={180} y={150} s={1.55} paint={c.team} pose="dribble" num={c.num} flip />
      <Ball x={198} y={150} r={4.8} sport="football" />
      <Figure x={110} y={128} s={1.25} paint={c.team} pose="run" skin={2} flip />
      <Figure x={262} y={130} s={1.25} paint={c.team} pose="run" skin={4} flip />
      <Figure x={150} y={98} s={1} paint={c.opp} pose="run" skin={1} />
      <Figure x={226} y={96} s={1} paint={c.opp} pose="run" skin={3} />
      <Arrow d="M110,110 L110,80" />
      <Arrow d="M262,112 L262,80" />
      <MotionLines x={214} y={124} />
    </>
  ),
  fb_defense: (c) => (
    <>
      <PitchBg uid={c.uid} variant="wide" crowd={c.crowd} />
      <line x1="0" y1="118" x2={W} y2="118" stroke="#fde047" strokeWidth="2" strokeDasharray="7 5" />
      <Figure x={120} y={118} s={1.25} paint={c.team} pose="stand" skin={2} />
      <Figure x={240} y={118} s={1.25} paint={c.team} pose="stand" skin={5} />
      <Figure x={180} y={160} s={1.55} paint={c.team} pose="keeper" num={c.num} />
      <Figure x={196} y={106} s={1.2} paint={c.opp} pose="run" skin={1} />
      <Ball x={210} y={104} r={4} sport="football" />
      <g transform="translate(330,72)">
        <line x1="0" y1="0" x2="0" y2="30" stroke="#475569" strokeWidth="2" />
        <rect x="0" y="0" width="14" height="10" fill="#facc15" stroke="#ef4444" />
      </g>
    </>
  ),

  // ---------------- basketball ----------------
  bb_three: (c) => (
    <>
      <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />
      <Hoop x={180} y={64} s={0.9} />
      <Figure x={100} y={162} s={1.6} paint={c.team} pose="shoot" num={c.num} raise={6} />
      <Figure x={130} y={160} s={1.55} paint={c.opp} pose="block" skin={3} raise={4} flip />
      <Ball x={104} y={78} r={5} sport="basketball" />
      <Arrow d="M110,76 Q150,10 178,58" color="#f97316" />
    </>
  ),
  bb_freethrow: (c) => (
    <>
      <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />
      <Hoop x={180} y={64} s={0.95} />
      <Figure x={180} y={160} s={1.65} paint={c.team} pose="shoot" num={c.num} />
      <Ball x={183} y={76} r={5} sport="basketball" />
      <Figure x={120} y={150} s={1.2} paint={c.opp} pose="stand" skin={2} />
      <Figure x={240} y={150} s={1.2} paint={c.opp} pose="stand" skin={4} flip />
    </>
  ),
  bb_pnr: (c) => (
    <>
      <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />
      <Hoop x={180} y={64} s={0.85} />
      <Figure x={140} y={160} s={1.55} paint={c.team} pose="dribble" num={c.num} />
      <Ball x={156} y={156} r={4.6} sport="basketball" />
      <Figure x={182} y={156} s={1.5} paint={c.team} pose="wall" skin={3} />
      <Figure x={168} y={150} s={1.4} paint={c.opp} pose="stand" skin={1} />
      <Figure x={212} y={146} s={1.35} paint={c.opp} pose="keeper" skin={4} />
      <Arrow d="M182,130 Q205,105 190,82" color="#ffffff" />
    </>
  ),
  bb_fastbreak: (c) => (
    <>
      <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />
      <Hoop x={300} y={70} s={0.75} />
      <Figure x={170} y={158} s={1.6} paint={c.team} pose="dribble" num={c.num} />
      <Ball x={188} y={156} r={4.8} sport="basketball" />
      <Figure x={110} y={140} s={1.35} paint={c.team} pose="run" skin={4} />
      <Figure x={250} y={150} s={1.45} paint={c.opp} pose="keeper" skin={2} flip />
      <MotionLines x={130} y={118} />
    </>
  ),
  bb_block: (c) => (
    <>
      <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />
      <Hoop x={180} y={64} s={0.9} />
      <Figure x={164} y={160} s={1.55} paint={c.opp} pose="shoot" skin={1} raise={16} />
      <Figure x={196} y={160} s={1.6} paint={c.team} pose="block" num={c.num} raise={22} flip />
      <Ball x={176} y={70} r={5} sport="basketball" />
    </>
  ),
  bb_post: (c) => (
    <>
      <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />
      <Hoop x={180} y={64} s={0.9} />
      <Figure x={186} y={150} s={1.6} paint={c.team} pose="wall" num={c.num} />
      <Ball x={198} y={126} r={4.8} sport="basketball" />
      <Figure x={176} y={162} s={1.6} paint={c.opp} pose="keeper" skin={3} />
    </>
  ),
  bb_drive: (c) => (
    <>
      <CourtBg uid={c.uid} paint={c.team.shirt} crowd={c.crowd} />
      <Hoop x={180} y={64} s={0.9} />
      <Figure x={160} y={160} s={1.6} paint={c.team} pose="dribble" num={c.num} flip />
      <Ball x={142} y={156} r={4.8} sport="basketball" />
      <Figure x={212} y={156} s={1.5} paint={c.opp} pose="keeper" skin={2} flip />
      <MotionLines x={186} y={126} />
      <Arrow d="M150,130 Q150,100 172,84" />
    </>
  ),

  // ---------------- general ----------------
  field: (c) => (
    <>
      {sportField(c)}
      {c.sport === 'basketball' && <Hoop x={180} y={64} s={0.9} />}
      {[100, 150, 210, 260].map((x, i) => (
        <polygon key={x} points={`${x - 6},${150 - i * 4} ${x + 6},${150 - i * 4} ${x},${134 - i * 4}`} fill="#f97316" />
      ))}
      <Figure x={180} y={160} s={1.6} paint={c.team} pose="stand" num={c.num} />
      <Ball x={198} y={158} r={5} sport={c.sport} />
    </>
  ),
  stadium: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#dusk${c.uid})`} />
      <Floodlight x={40} y={14} />
      <Floodlight x={320} y={14} />
      <rect y="40" width={W} height="36" fill="#334155" />
      <Crowd y={44} rows={3} colors={c.crowd} />
      {c.sport === 'football' ? (
        <>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={i * 45} y="76" width="45" height="94" fill={i % 2 ? '#4fb862' : '#5cc56f'} />
          ))}
          <ellipse cx="180" cy="128" rx="60" ry="22" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.85" />
        </>
      ) : (
        <>
          <rect y="76" width={W} height="94" fill="#f0bf82" />
          <ellipse cx="180" cy="128" rx="40" ry="16" fill="none" stroke="#ffffff" strokeWidth="1.8" />
        </>
      )}
      <Figure x={150} y={160} s={1.55} paint={c.team} pose="cheer" num={c.num} />
      <Figure x={210} y={160} s={1.55} paint={c.team} pose="run" skin={3} flip />
      <Ball x={232} y={158} r={5} sport={c.sport} />
    </>
  ),
  locker: (c) => (
    <>
      <RoomBg uid={c.uid} wall="#e3ecf8" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x={18 + i * 47} y="18" width="42" height="104" rx="3" fill="#cbd8ea" stroke="#a9bad3" />
          <circle cx={52 + i * 47} cy="70" r="2" fill="#7b8fae" />
          <rect x={24 + i * 47} y="30" width="30" height="34" rx="6" fill={c.team.shirt} />
          <text x={39 + i * 47} y="53" textAnchor="middle" fontSize="11" fontWeight="900" fill={readableOn(c.team.shirt)} fontFamily="Heebo, sans-serif">
            {i === 3 && c.num !== undefined ? c.num : [7, 4, 9, 0, 11, 5, 23][i]}
          </text>
        </g>
      ))}
      <rect x="40" y="132" width="280" height="10" rx="3" fill="#a16207" />
      <Figure x={120} y={150} s={1.45} paint={c.team} pose="stand" skin={2} />
      <Figure x={240} y={150} s={1.45} paint={c.team} pose="cheer" skin={4} />
      <Figure x={180} y={162} s={1.65} paint={c.team} pose="point" num={c.num} />
    </>
  ),
  coach_board: (c) => (
    <>
      <RoomBg uid={c.uid} wall="#e6eef9" />
      <rect x="150" y="22" width="180" height="100" rx="6" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
      {c.sport === 'football' ? (
        <g stroke="#16a34a" strokeWidth="1.4" fill="none">
          <rect x="160" y="32" width="160" height="80" />
          <line x1="240" y1="32" x2="240" y2="112" />
          <circle cx="240" cy="72" r="12" />
        </g>
      ) : (
        <g stroke="#f97316" strokeWidth="1.4" fill="none">
          <path d="M160,32 H320 V112 H160 Z M210,32 V70 H270 V32 M200,112 Q240,60 280,112" />
        </g>
      )}
      <g fontFamily="Heebo, sans-serif" fontWeight="900" fontSize="12">
        <text x="190" y="62" fill={c.team.shirt === '#ffffff' ? '#2f6bff' : c.team.shirt}>X</text>
        <text x="220" y="94" fill={c.team.shirt === '#ffffff' ? '#2f6bff' : c.team.shirt}>X</text>
        <text x="282" y="58" fill="#334155">O</text>
        <text x="268" y="96" fill="#334155">O</text>
      </g>
      <Arrow d="M196,60 Q230,40 262,56" color="#ef4444" />
      <Figure x={130} y={160} s={1.7} paint={STAFF} pose="point" skin={1} />
      <Figure x={60} y={162} s={1.5} paint={c.team} pose="stand" num={c.num} />
    </>
  ),
  office: (c) => (
    <>
      <RoomBg uid={c.uid} wall="#eef2f8" floor="#d6dde8" />
      <rect x="196" y="20" width="140" height="80" rx="4" fill="#bfe3ff" />
      <svg x="196" y="20" width="140" height="80" viewBox="196 20 140 80">
        <Skyline y={100} color="#93add3" />
      </svg>
      <rect x="196" y="20" width="140" height="80" rx="4" fill="none" stroke="#94a3b8" strokeWidth="3" />
      <rect x="40" y="112" width="200" height="12" rx="2" fill="#8b5e34" />
      <rect x="50" y="124" width="10" height="36" fill="#6b4423" />
      <rect x="220" y="124" width="10" height="36" fill="#6b4423" />
      <rect x="110" y="102" width="44" height="10" rx="1" fill="#ffffff" stroke="#cbd5e1" transform="rotate(-6 132 107)" />
      <line x1="150" y1="98" x2="166" y2="108" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <Figure x={80} y={112} s={1.5} paint={STAFF} pose="point" skin={4} />
      <Figure x={190} y={112} s={1.5} paint={c.team} pose="stand" num={c.num} flip />
    </>
  ),
  fans: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#sky${c.uid})`} />
      <rect y="40" width={W} height="130" fill="#cbd5e1" />
      <Crowd y={50} rows={10} colors={c.crowd} />
      <rect x="70" y="18" width="220" height="30" rx="4" fill={c.team.shirt} stroke={c.team.shorts} strokeWidth="3" />
      <text x="180" y="40" textAnchor="middle" fontSize="16" fontWeight="900" fill={readableOn(c.team.shirt)} fontFamily="Heebo, sans-serif">
        {c.label ?? 'יאללה קבוצה'}
      </text>
      <rect x="0" y="148" width={W} height="22" fill="#5cc56f" />
      <Figure x={180} y={168} s={1.6} paint={c.team} pose="cheer" num={c.num} />
    </>
  ),
  phone: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#soft${c.uid})`} />
      {[30, 70, 290, 330].map((x, i) => (
        <rect key={x} x={x - 14} y={30 + (i % 2) * 70} width="28" height="28" rx="8" fill={['#2f6bff', '#f97316', '#22c55e', '#e11d48'][i]} opacity="0.35" />
      ))}
      <rect x="128" y="10" width="104" height="160" rx="16" fill={INK} />
      <rect x="134" y="20" width="92" height="146" rx="10" fill="#f8fafc" />
      <rect x="164" y="13" width="32" height="4" rx="2" fill="#475569" />
      <rect x="140" y="34" width="62" height="18" rx="8" fill="#e2e8f0" />
      <rect x="160" y="58" width="60" height="18" rx="8" fill="#2f6bff" />
      <rect x="140" y="82" width="70" height="26" rx="8" fill="#e2e8f0" />
      <rect x="168" y="114" width="52" height="18" rx="8" fill="#2f6bff" />
      <circle cx="226" cy="18" r="9" fill="#ef4444" />
      <text x="226" y="22" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ffffff" fontFamily="Heebo, sans-serif">
        3
      </text>
    </>
  ),
  press: (c) => (
    <>
      <rect width={W} height={H} fill="#f1f5fb" />
      {Array.from({ length: 24 }, (_, i) => (
        <g key={i}>
          <rect x={(i % 6) * 60 + 6} y={Math.floor(i / 6) * 30 + 6} width="48" height="22" rx="3" fill={i % 2 ? c.team.shirt : '#ffffff'} stroke="#dbe4f0" />
          <text
            x={(i % 6) * 60 + 30}
            y={Math.floor(i / 6) * 30 + 21}
            textAnchor="middle"
            fontSize="8"
            fontWeight="900"
            fill={i % 2 ? readableOn(c.team.shirt) : '#2f6bff'}
            fontFamily="Heebo, sans-serif"
          >
            {i % 2 ? (c.label ?? 'ליגה') : 'ספורט'}
          </text>
        </g>
      ))}
      <Figure x={180} y={136} s={1.6} paint={c.team} pose="stand" num={c.num} />
      <rect x="60" y="120" width="240" height="50" rx="3" fill="#1e293b" />
      {[140, 165, 195, 220].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="122" x2={180 + (x - 180) * 0.25} y2="100" stroke="#475569" strokeWidth="2" />
          <rect x={180 + (x - 180) * 0.25 - 4} y="92" width="8" height="11" rx="3" fill={['#ef4444', '#2f6bff', '#f59e0b', '#10b981'][i]} />
        </g>
      ))}
      {[40, 320].map((x) => (
        <g key={x} opacity="0.85">
          <circle cx={x} cy="60" r="10" fill="#fff7cc" />
          <circle cx={x} cy="60" r="18" fill="#fff7cc" opacity="0.35" />
        </g>
      ))}
    </>
  ),
  gym: (c) => (
    <>
      <RoomBg uid={c.uid} wall="#e7eef9" floor="#94a3b8" />
      <rect x="20" y="30" width="320" height="46" rx="4" fill="#cfe0f5" />
      <line x1="20" y1="53" x2="340" y2="53" stroke="#ffffff" strokeWidth="2" />
      {[60, 110, 250, 300].map((x) => (
        <g key={x}>
          <rect x={x - 14} y="104" width="28" height="6" rx="2" fill="#475569" />
          <rect x={x - 18} y="98" width="8" height="18" rx="2" fill="#1e293b" />
          <rect x={x + 10} y="98" width="8" height="18" rx="2" fill="#1e293b" />
        </g>
      ))}
      <Figure x={180} y={160} s={1.7} paint={c.team} pose="lift" num={c.num} />
      <line x1="140" y1="88" x2="220" y2="88" stroke="#334155" strokeWidth="3" />
      <rect x="132" y="78" width="10" height="20" rx="2" fill="#1e293b" />
      <rect x="218" y="78" width="10" height="20" rx="2" fill="#1e293b" />
    </>
  ),
  home: (c) => (
    <>
      <RoomBg uid={c.uid} wall="#f3eadf" floor="#d9c3a5" />
      <rect x="220" y="24" width="110" height="70" rx="4" fill="#1e3a8a" stroke="#ffffff" strokeWidth="4" />
      <circle cx="300" cy="44" r="10" fill="#fef3c7" />
      <line x1="275" y1="24" x2="275" y2="94" stroke="#ffffff" strokeWidth="3" />
      <rect x="40" y="40" width="90" height="56" rx="3" fill={INK} />
      <rect x="45" y="45" width="80" height="46" fill={c.sport === 'football' ? '#5cc56f' : '#f0bf82'} />
      <rect x="40" y="110" width="150" height="34" rx="10" fill="#2f6bff" opacity="0.85" />
      <rect x="40" y="98" width="150" height="16" rx="8" fill="#4c7dff" />
      <Figure x={110} y={128} s={1.4} paint={c.team} pose="stand" num={c.num} />
      <line x1="250" y1="160" x2="250" y2="110" stroke="#a16207" strokeWidth="3" />
      <path d="M236,110 L264,110 L256,96 L244,96 Z" fill="#fde68a" />
    </>
  ),
  party: (c) => (
    <>
      <rect width={W} height={H} fill="#24304a" />
      <path d="M0,20 Q90,48 180,20 Q270,48 360,20" fill="none" stroke="#94a3b8" />
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={i * 26 + 12} cy={20 + Math.sin(i / 1.4) * 10 + 12} r="4.5" fill={['#facc15', '#f472b6', '#60a5fa', '#34d399'][i % 4]} />
      ))}
      <rect y="128" width={W} height="42" fill="#334155" />
      <rect x="120" y="108" width="120" height="10" rx="2" fill="#a16207" />
      <Figure x={90} y={150} s={1.5} paint={{ shirt: '#f472b6', shorts: '#1e293b' }} pose="cheer" skin={2} />
      <Figure x={270} y={150} s={1.5} paint={{ shirt: '#34d399', shorts: '#1e293b' }} pose="cheer" skin={5} />
      <Figure x={180} y={160} s={1.65} paint={c.team} pose="cheer" num={c.num} />
    </>
  ),
  shop: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#sky${c.uid})`} />
      <rect x="20" y="30" width="320" height="120" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="20" y="20" width="320" height="26" fill="#2f6bff" />
      <text x="180" y="38" textAnchor="middle" fontSize="15" fontWeight="900" fill="#ffffff" fontFamily="Heebo, sans-serif">
        ספורט ובריאות
      </text>
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="40" y={62 + r * 28} width="130" height="4" fill="#94a3b8" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={46 + i * 31} y={46 + r * 28} width="24" height="16" rx="3" fill={['#f97316', '#2f6bff', '#22c55e', '#e11d48'][(i + r) % 4]} />
          ))}
        </g>
      ))}
      <rect y="150" width={W} height="20" fill="#cbd5e1" />
      <Figure x={260} y={156} s={1.7} paint={c.team} pose="point" num={c.num} />
    </>
  ),
  street: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#sky${c.uid})`} />
      <Skyline y={92} color="#b6c8e2" />
      {[40, 320].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="74" width="6" height="40" fill="#92400e" />
          <circle cx={x} cy="70" r="20" fill="#4ade80" />
          <circle cx={x - 12} cy="80" r="12" fill="#22c55e" />
        </g>
      ))}
      <rect y="110" width={W} height="60" fill={c.sport === 'football' ? '#64748b' : '#3b82f6'} opacity="0.85" />
      <g stroke="#ffffff" strokeWidth="1.5" opacity="0.8" fill="none">
        <line x1="180" y1="110" x2="180" y2="170" />
        <circle cx="180" cy="140" r="16" />
      </g>
      {c.sport === 'basketball' ? <Hoop x={300} y={118} s={0.6} /> : <Goal x={286} y={96} w={56} h={22} />}
      <Figure x={110} y={160} s={1.15} paint={{ shirt: '#f97316', shorts: '#1e293b' }} pose="run" skin={2} />
      <Figure x={140} y={164} s={1.15} paint={{ shirt: '#a855f7', shorts: '#1e293b' }} pose="cheer" skin={4} />
      <Figure x={200} y={164} s={1.6} paint={c.team} pose="dribble" num={c.num} flip />
      <Ball x={182} y={162} r={4.6} sport={c.sport} />
    </>
  ),
  work: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#sky${c.uid})`} />
      <Skyline y={120} />
      <rect x="230" y="40" width="100" height="80" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
      <rect x="296" y="14" width="14" height="30" fill="#94a3b8" />
      <circle cx="303" cy="8" r="6" fill="#e2e8f0" opacity="0.8" />
      <rect x="250" y="80" width="26" height="40" fill="#64748b" />
      <rect y="120" width={W} height="50" fill="#94a3b8" />
      <line x1="0" y1="145" x2={W} y2="145" stroke="#ffffff" strokeWidth="2" strokeDasharray="14 10" />
      <g transform="translate(80,150)">
        <circle cx="-18" cy="6" r="8" fill={INK} />
        <circle cx="22" cy="6" r="8" fill={INK} />
        <path d="M-24,0 L-4,-14 L18,-14 L28,0 Z" fill="#ef4444" />
        <rect x="-26" y="-26" width="22" height="14" rx="2" fill="#f59e0b" />
      </g>
      <Figure x={170} y={160} s={1.6} paint={{ shirt: '#f97316', shorts: '#334155' }} pose="stand" skin={0} num={c.num} />
    </>
  ),
  national: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#sky${c.uid})`} />
      <rect y="30" width={W} height="40" fill="#cbd5e1" />
      <Crowd y={34} rows={4} colors={['#ffffff', '#0038b8', '#ffffff', '#93c5fd']} />
      <IsraelFlag x={24} y={14} w={74} />
      <IsraelFlag x={262} y={14} w={74} />
      {c.sport === 'football' ? (
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={i * 45} y="96" width="45" height="74" fill={i % 2 ? '#4fb862' : '#5cc56f'} />)
      ) : (
        <rect y="96" width={W} height="74" fill="#f0bf82" />
      )}
      {[0, 1, 2, 3, 4].map((i) => (
        <Figure key={i} x={100 + i * 40} y={i === 2 ? 166 : 156} s={i === 2 ? 1.65 : 1.35} paint={{ shirt: '#ffffff', shorts: '#0038b8' }} pose="stand" skin={i + 1} num={i === 2 ? c.num : undefined} />
      ))}
    </>
  ),
  trophy: (c) => (
    <>
      <rect width={W} height={H} fill={`url(#dusk${c.uid})`} />
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={(i * 37) % W} y={(i * 53) % 120} width="5" height="9" rx="1" fill={['#facc15', '#60a5fa', '#f472b6', '#34d399', '#ffffff'][i % 5]} transform={`rotate(${(i * 29) % 90} ${(i * 37) % W} ${(i * 53) % 120})`} />
      ))}
      <rect x="140" y="130" width="80" height="40" rx="4" fill="#e2e8f0" />
      <path d="M156,60 H204 V82 C204,100 192,108 180,108 C168,108 156,100 156,82 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="2" />
      <path d="M156,66 H144 Q142,86 158,90 M204,66 H216 Q218,86 202,90" fill="none" stroke="#fbbf24" strokeWidth="5" />
      <rect x="174" y="108" width="12" height="12" fill="#f59e0b" />
      <rect x="162" y="120" width="36" height="10" rx="2" fill="#b45309" />
      <Figure x={100} y={160} s={1.5} paint={c.team} pose="cheer" skin={2} />
      <Figure x={260} y={160} s={1.5} paint={c.team} pose="cheer" num={c.num} />
    </>
  ),
};

const FALLBACK: Record<string, string> = {
  football: 'fb_counter',
  basketball: 'bb_drive',
};

/** Renders a situation illustration. Unknown scene keys fall back to a sport scene. */
export function SceneArt({ scene, sport, team, opp, number, label, className = '', height }: SceneArtProps) {
  const uid = useId().replace(/:/g, '');
  const render = SCENES[scene] ?? SCENES[FALLBACK[sport]];
  const ctx: Ctx = {
    uid,
    sport,
    team,
    opp: opp ?? NEUTRAL_OPP,
    num: number,
    label,
    crowd: [team.shirt, team.shorts, '#ffffff', team.shirt, '#94a3b8'],
  };
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`block w-full ${className}`}
      style={height ? { height } : undefined}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <SkyGradient id={`sky${uid}`} />
        <SkyGradient id={`dusk${uid}`} top="#1e3a8a" bottom="#60a5fa" />
        <SkyGradient id={`soft${uid}`} top="#dbeafe" bottom="#f5f3ff" />
        <linearGradient id={`wall${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id={`shade${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {render(ctx)}
    </svg>
  );
}
