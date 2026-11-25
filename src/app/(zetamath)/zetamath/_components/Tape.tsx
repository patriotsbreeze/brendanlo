import type { Solved } from "../_lib/runs";

/** A run as a strip: one tick per answer, at the moment it landed. Even ticks
 * are a steady hand; a gap is a problem that cost you. */
export function Tape({
  solved,
  total,
  elapsed,
  slow,
}: {
  solved: readonly Solved[];
  total: number;
  elapsed: number;
  /** Answers to pick out, once the run is over. */
  slow?: ReadonlySet<Solved>;
}) {
  const x = (ms: number) => (ms / total) * 1000;
  return (
    <svg
      className="tape"
      viewBox="0 0 1000 20"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${solved.length} answers over ${Math.round(total / 1000)} seconds`}
    >
      <line className="track" x1={0} x2={1000} y1={19} y2={19} />
      <line className="run" x1={0} x2={x(elapsed)} y1={19} y2={19} />
      {solved.map((s, i) => {
        const gap = slow?.has(s);
        return (
          <g key={i}>
            {gap && <rect className="gap" x={x(s.at - s.ms)} width={x(s.ms)} y={4} height={15} />}
            <line className={gap ? "tick slow" : "tick"} x1={x(s.at)} x2={x(s.at)} y1={4} y2={19} />
          </g>
        );
      })}
    </svg>
  );
}
