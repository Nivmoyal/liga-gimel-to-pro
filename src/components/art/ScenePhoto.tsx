import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SportType } from '../../types/game';
import { backdropFor, hasInstalledPhotos, photoFor } from '../../data/photos';
import type { Backdrop } from '../../data/photos';
import { hashString } from '../../data/clubIdentity';
import { PORTRAIT_KEYS } from '../../data/photoQueries';
import { cachedPhotos, loadPhotos, photoKey } from '../../services/photoService';
import type { RemotePhoto } from '../../services/photoService';

/** Installed photo first, otherwise (only when none are installed) a live Commons photo, otherwise null. */
function useScenePhoto(scene: string, sport: SportType, seed: string) {
  const local = photoFor(scene, sport, seed);
  // Once a local (AI) set is installed, no real photos are fetched from the web.
  const key = local || hasInstalledPhotos() ? null : photoKey(scene, sport);
  const [remote, setRemote] = useState<RemotePhoto[] | null>(() => (key ? cachedPhotos(key) : null));
  const [failed, setFailed] = useState(0);
  useEffect(() => {
    setFailed(0);
    if (!key) return;
    const hit = cachedPhotos(key);
    if (hit) {
      setRemote(hit);
      return;
    }
    let alive = true;
    loadPhotos(key, PORTRAIT_KEYS.has(scene)).then((photos) => alive && setRemote(photos.length ? photos : null));
    return () => {
      alive = false;
    };
  }, [key, scene]);
  if (local) return { src: local.file.startsWith('data:') ? local.file : `${import.meta.env.BASE_URL}${local.file}`, author: local.author, title: local.title, onError: () => {} };
  if (!remote || failed >= remote.length) return null;
  const pool = Math.min(remote.length, 10);
  const photo = remote[(hashString(seed || scene) + failed) % pool];
  return { src: photo.url, author: photo.author, title: photo.title, onError: () => setFailed((f) => f + 1) };
}

interface ScenePhotoProps {
  scene: string;
  sport: SportType;
  seed?: string;
  height?: number | string;
  className?: string;
  /** Overlays (badges, scoreboards) rendered on top of the photo. */
  children?: ReactNode;
  fade?: boolean;
}

const SOFT_EDGES = 'linear-gradient(180deg, transparent 0%, #000 18%, #000 80%, transparent 100%)';

/**
 * Real photo for a scene with a cinematic grade. When no photo is installed
 * for the scene, a dark atmospheric backdrop is shown instead.
 */
export function ScenePhoto({ scene, sport, seed, height = 200, className = '', children, fade = true }: ScenePhotoProps) {
  const photo = useScenePhoto(scene, sport, seed ?? '');
  const [loaded, setLoaded] = useState(false);
  const [wide, setWide] = useState(false);
  useEffect(() => setLoaded(false), [photo?.src]);
  // A landscape picture on a full-screen portrait scene is shown whole over a
  // blurred copy of itself instead of being cropped to a narrow, blown-up strip.
  const letterbox = wide && PORTRAIT_KEYS.has(scene);
  return (
    <div className={`relative overflow-hidden bg-black ${fade ? 'photo-fade' : ''} ${className}`} style={{ height }}>
      <CinematicBackdrop kind={backdropFor(scene, sport)} />
      {photo && letterbox && (
        <img
          src={photo.src}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full scale-125 object-cover blur-2xl transition-opacity duration-500 ${loaded ? 'opacity-70' : 'opacity-0'}`}
        />
      )}
      {photo && (
        <img
          key={photo.src}
          src={photo.src}
          alt={photo.title ?? ''}
          referrerPolicy="no-referrer"
          onLoad={(e) => {
            setWide(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight * 1.2);
            setLoaded(true);
          }}
          onError={photo.onError}
          className={`absolute transition-opacity duration-500 ${letterbox ? 'inset-x-0 top-[27%] h-auto w-full' : 'inset-0 h-full w-full object-cover'} ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={letterbox ? { maskImage: SOFT_EDGES, WebkitMaskImage: SOFT_EDGES } : undefined}
        />
      )}
      {photo?.author && loaded && (
        <span className="absolute right-2 top-1 z-20 max-w-[60%] truncate text-[9px] text-white/45">{photo.author === 'תמונת AI' ? photo.author : `צילום: ${photo.author}`}</span>
      )}
      {children && <div className="absolute inset-0 z-10">{children}</div>}
    </div>
  );
}

const BACKDROPS: Record<Backdrop, string> = {
  pitch:
    'radial-gradient(90% 70% at 50% 0%, rgb(255 236 179 / 0.35), transparent 60%), linear-gradient(180deg, #1d3a24 0%, #1f5a2e 45%, #123a1d 100%)',
  court:
    'radial-gradient(80% 60% at 50% 0%, rgb(255 226 160 / 0.4), transparent 60%), linear-gradient(180deg, #2a1a0e 0%, #6b3f1c 50%, #3b230f 100%)',
  indoor: 'radial-gradient(70% 80% at 50% 20%, rgb(227 178 76 / 0.25), transparent 65%), linear-gradient(180deg, #1a211d 0%, #0b0f0d 100%)',
  night:
    'radial-gradient(40% 50% at 15% 0%, rgb(255 244 214 / 0.45), transparent 70%), radial-gradient(40% 50% at 85% 0%, rgb(255 244 214 / 0.45), transparent 70%), linear-gradient(180deg, #0c1420 0%, #102a1a 60%, #0a1a10 100%)',
  street: 'radial-gradient(90% 70% at 70% 0%, rgb(255 190 110 / 0.45), transparent 60%), linear-gradient(180deg, #3a2a1c 0%, #1b1f1c 70%, #0d100e 100%)',
  national:
    'radial-gradient(70% 60% at 50% 10%, rgb(56 120 255 / 0.45), transparent 65%), linear-gradient(180deg, #0a1633 0%, #0d2a5c 50%, #08142b 100%)',
};

/** Atmospheric light-and-lines backdrop, used until a real photo is added. */
function CinematicBackdrop({ kind }: { kind: Backdrop }) {
  return (
    <div className="absolute inset-0" style={{ background: BACKDROPS[kind] }}>
      {kind === 'pitch' && (
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-25">
          <g stroke="#ffffff" strokeWidth="1.2" fill="none">
            <polygon points="70,40 330,40 400,200 0,200" />
            <polygon points="150,40 250,40 262,70 138,70" />
            <ellipse cx="200" cy="200" rx="70" ry="22" />
          </g>
        </svg>
      )}
      {kind === 'court' && (
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-25">
          <g stroke="#ffffff" strokeWidth="1.2" fill="none">
            <polygon points="160,30 240,30 262,140 138,140" />
            <path d="M60,30 Q60,200 200,200 Q340,200 340,30" />
            <ellipse cx="200" cy="140" rx="24" ry="8" />
          </g>
        </svg>
      )}
      {(kind === 'night' || kind === 'national') && (
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.05)_0_2px,transparent_2px_14px)]" />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:6px_6px]" />
    </div>
  );
}
