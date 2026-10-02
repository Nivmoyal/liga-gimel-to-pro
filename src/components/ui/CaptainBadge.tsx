/** Gold armband "C" shown next to the captain's name. */
export function CaptainBadge({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-brand font-black leading-none text-black ring-1 ring-black/30"
      style={{ width: size, height: size, fontSize: size * 0.62 }}
      title="קפטן"
      aria-label="קפטן"
    >
      C
    </span>
  );
}
