/**
 * Cadence mark — three offset bars reading as both a Gantt timeline and a
 * rhythm/beat pattern, drawn in the same outlined tile as Sketchspace.
 */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="1" y="1" width="24" height="24" rx="5" stroke="var(--accent-bright)" strokeWidth="2" />
      <rect x="5" y="6.5" width="12" height="2.5" rx="1.25" fill="var(--accent-bright)" />
      <rect x="8" y="11.75" width="13" height="2.5" rx="1.25" fill="var(--accent-bright)" />
      <rect x="5" y="17" width="9" height="2.5" rx="1.25" fill="var(--accent-bright)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Logo />
      <span className="text-[1.125rem] font-extrabold tracking-[-0.045em]">
        Cadence
      </span>
    </span>
  );
}
