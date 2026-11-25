"use client";

import { trailingMean, type Run } from "../_lib/runs";
import {
  clock,
  nearestIndex,
  PAD,
  shortDay,
  ticks,
  Tooltip,
  useCursor,
  useWidth,
} from "./chartKit";

const HEIGHT = 250;
export const WINDOW = 10;

/** Every run in the order it was played, evenly spaced, with a running average
 * so a lucky one does not look like progress. */
export function AttemptChart({
  runs,
  bestIds,
  domain,
}: {
  /** Oldest first. Excluded runs, if any, are drawn but not averaged. */
  runs: readonly Run[];
  bestIds: ReadonlySet<string>;
  domain: readonly [number, number];
}) {
  const [ref, width] = useWidth();
  const n = runs.length;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  // Inset by half a step so the first and last dots clear the edges.
  const step = plotW / Math.max(n, 8);
  const xs = runs.map((_, i) => PAD.left + (i + 0.5) * step);
  const [lo, hi] = domain;
  const base = HEIGHT - PAD.bottom;
  const y = (score: number) => PAD.top + (1 - (score - lo) / (hi - lo)) * (base - PAD.top);
  const r = step >= 9 ? 4 : 3;

  const counted = runs.flatMap((run, i) => (run.excluded ? [] : [{ run, x: xs[i] }]));
  const means = trailingMean(counted.map((c) => c.run.score), WINDOW);
  const meanOf = new Map(counted.map((c, i) => [c.run.id, means[i]]));
  const averaged = new Map(counted.map((c, i) => [c.run.id, Math.min(WINDOW, i + 1)]));

  const [at, handlers] = useCursor(n, (px) => nearestIndex(xs, px));
  const hover = at === null ? null : runs[at];

  const xTicks = ticks(1, n, Math.max(2, Math.floor(plotW / 90))).filter((t) => t >= 1 && t <= n);

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT + 14}
          role="img"
          aria-label={`Every run in order, ${n} runs. Use the arrow keys to read each one.`}
          {...handlers}
        >
          {ticks(lo, hi, 5).map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="tickLabel" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          <line className="axis" x1={PAD.left} x2={width - PAD.right} y1={base} y2={base} />
          {xTicks.map((t) => (
            <text key={t} className="tickLabel" x={xs[t - 1]} y={base + 16} textAnchor="middle">
              {t}
            </text>
          ))}
          <text className="panelLabel" x={width - PAD.right} y={base + 32} textAnchor="end">
            attempt
          </text>

          {hover && at !== null && (
            <line className="crosshair" x1={xs[at]} x2={xs[at]} y1={PAD.top} y2={base} />
          )}

          {runs.map((run, i) => (
            <circle
              key={run.id}
              className={`dot ${run.excluded ? "excluded" : bestIds.has(run.id) ? "best" : "try"}`}
              cx={xs[i]}
              cy={y(run.score)}
              r={run.excluded ? r - 0.5 : r}
            />
          ))}
          {counted.length > 1 && (
            <polyline className="meanLine" points={counted.map((c, i) => `${c.x},${y(means[i])}`).join(" ")} />
          )}
          {hover && at !== null && (
            <circle className="halo" cx={xs[at]} cy={y(hover.score)} r={r + 4} />
          )}
        </svg>
      )}
      {hover && at !== null && (
        <Tooltip
          x={xs[at]}
          width={width}
          title={`${shortDay(hover.day)}, ${clock(hover.at)}`}
          rows={
            hover.excluded
              ? [{ key: "excluded", value: String(hover.score), label: "left out" }]
              : [
                  {
                    key: bestIds.has(hover.id) ? "best" : "try",
                    value: String(hover.score),
                    label: bestIds.has(hover.id) ? "best that day" : `attempt ${at + 1}`,
                  },
                  {
                    key: "mean",
                    value: (meanOf.get(hover.id) ?? 0).toFixed(1),
                    label: `average of last ${averaged.get(hover.id)}`,
                  },
                ]
          }
        />
      )}
    </div>
  );
}
