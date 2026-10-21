import { A, K, PARFUM, S } from "./logo-paths";

type Props = { showParfum?: boolean; className?: string };

export function Logo({ showParfum = true, className }: Props) {
  return (
    <svg viewBox={`0 0 200 ${showParfum ? 65.2 : 40}`} role="img" aria-label="SAKA Parfum" className={className}>
      <path d={S} fill="none" stroke="currentColor" strokeWidth="5" />
      <path d={A} fill="currentColor" fillRule="evenodd" />
      <path d={K} fill="currentColor" />
      <path d={A} fill="currentColor" fillRule="evenodd" transform="translate(113 0)" />
      {showParfum && (
        <g transform="translate(0 53.6)" fill="none" stroke="currentColor" strokeWidth="1.3">
          {PARFUM.map(({ x, d }) => (
            <path key={x} d={d} transform={`translate(${x} 0)`} />
          ))}
        </g>
      )}
    </svg>
  );
}
