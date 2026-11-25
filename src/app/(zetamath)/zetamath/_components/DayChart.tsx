"use client";

import { DAY_MS, dayToMs, type Day, type Run } from "../_lib/runs";
import {
  longDay,
  nearestIndex,
  PAD,
  shortDay,
  ticks,
  Tooltip,
  useCursor,
  useWidth,
} from "./chartKit";

const SCORE_H = 240;
const COUNT_H = 56;
const GAP = 40;

/** Two panels on one calendar: every try with the best of each day joined up,
 * and underneath, how many tries that day had. */
export function DayChart({
  days,
  excluded,
  domain,
}: {
  days: readonly Day[];
  excluded: readonly Run[];
  domain: readonly [number, number];
}) {
  const [ref, width] = useWidth();

  const keys = [...days.map((d) => d.day), ...excluded.map((r) => r.day)].sort();
  const first = dayToMs(keys[0]);
  // Never fewer than a week across, so one day is not a wall of dots.
  const span = Math.max(7, Math.round((dayToMs(keys[keys.length - 1]) - first) / DAY_MS) + 1);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const band = plotW / span;
  const bandStart = (day: string) => PAD.left + Math.round((dayToMs(day) - first) / DAY_MS) * band;
  const mid = (day: string) => bandStart(day) + band / 2;

  const [lo, hi] = domain;
  const y = (score: number) =>
    PAD.top + (1 - (score - lo) / (hi - lo)) * (SCORE_H - PAD.top);
  const mostTries = Math.max(...days.map((d) => d.runs.length), 1);
  const countTop = SCORE_H + GAP;
  const countBase = countTop + COUNT_H;
  const height = countBase + PAD.bottom;

  // Within a day, tries spread left to right in the order they were played.
  const spread = (day: string, i: number, n: number) => {
    const room = Math.min(band * 0.62, 12 * Math.max(0, n - 1));
    return mid(day) + (n > 1 ? (i / (n - 1) - 0.5) * room : 0);
  };
  const r = band >= 20 ? 4 : 3;

  const points = days.map((d) => ({
    day: d,
    tries: d.runs.map((run, i) => ({ run, x: spread(d.day, i, d.runs.length) })),
  }));
  const bests = points.map((p) => p.tries.find((t) => t.run === p.day.best)!);
  const record = bests.reduce((top, b) => (b.run.score > top.run.score ? b : top));
  const latest = bests[bests.length - 1];

  const [at, handlers] = useCursor(days.length, (px) =>
    nearestIndex(days.map((d) => mid(d.day)), px),
  );
  const hover = at === null ? null : points[at];

  // Day labels: as many as fit, always including the first day.
  const every = Math.max(1, Math.ceil(span / Math.max(2, Math.floor(plotW / 72))));
  const dayTicks = Array.from({ length: Math.ceil(span / every) }, (_, i) => i * every);

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Scores by day, ${days.length} days. Best ${record.run.score}. Use the arrow keys to read each day.`}
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

          {hover && (
            <line className="crosshair" x1={mid(hover.day.day)} x2={mid(hover.day.day)} y1={PAD.top} y2={countBase} />
          )}

          <polyline className="bestLine" points={bests.map((b) => `${b.x},${y(b.run.score)}`).join(" ")} />
          {excluded.map((run) => (
            <circle key={run.id} className="dot excluded" cx={mid(run.day)} cy={y(run.score)} r={r - 0.5} />
          ))}
          {points.flatMap((p) =>
            p.tries
              .filter((t) => t.run !== p.day.best)
              .map((t) => (
                <circle key={t.run.id} className="dot try" cx={t.x} cy={y(t.run.score)} r={r} />
              )),
          )}
          {bests.map((b) => (
            <circle key={b.run.id} className="dot best" cx={b.x} cy={y(b.run.score)} r={r + 0.5} />
          ))}

          <text
            className="markLabel"
            x={Math.min(record.x, width - PAD.right - 4)}
            y={y(record.run.score) - 10}
            textAnchor={record.x > width - 40 ? "end" : "middle"}
          >
            {record.run.score}
          </text>
          {latest !== record && Math.abs(latest.x - record.x) > 26 && (
            <text
              className="markLabel"
              x={Math.min(latest.x, width - PAD.right - 4)}
              y={y(latest.run.score) - 10}
              textAnchor={latest.x > width - 40 ? "end" : "middle"}
            >
              {latest.run.score}
            </text>
          )}

          <text className="panelLabel" x={0} y={countTop - 14}>
            tries per day
          </text>
          <line className="grid" x1={PAD.left} x2={width - PAD.right} y1={countTop} y2={countTop} />
          <text className="tickLabel" x={PAD.left - 8} y={countTop} dy="0.32em" textAnchor="end">
            {mostTries}
          </text>
          {days.map((d, i) => {
            const w = Math.max(1.5, Math.min(24, band - 2));
            const h = (d.runs.length / mostTries) * COUNT_H;
            const x0 = mid(d.day) - w / 2;
            const c = Math.min(4, w / 2, h);
            return (
              <path
                key={d.day}
                className={i === at ? "count on" : "count"}
                d={`M${x0},${countBase} v${-(h - c)} q0,${-c} ${c},${-c} h${w - 2 * c} q${c},0 ${c},${c} v${h - c} z`}
              />
            );
          })}
          <line className="axis" x1={PAD.left} x2={width - PAD.right} y1={countBase} y2={countBase} />
          {dayTicks.map((i) => (
            <text
              key={i}
              className="tickLabel"
              x={PAD.left + (i + 0.5) * band}
              y={countBase + 16}
              textAnchor={i === 0 && band < 30 ? "start" : "middle"}
            >
              {shortDay(first + i * DAY_MS)}
            </text>
          ))}
        </svg>
      )}
      {hover && (
        <Tooltip
          x={mid(hover.day.day)}
          width={width}
          title={longDay(hover.day.day)}
          rows={[
            { key: "best", value: String(hover.day.best.score), label: "best" },
            {
              value: mean(hover.day.runs).toFixed(1),
              label: "average",
            },
            {
              key: "try",
              value: String(hover.day.runs.length),
              label: hover.day.runs.length === 1 ? "try" : "tries",
            },
          ]}
        />
      )}
    </div>
  );
}

const mean = (runs: readonly Run[]) => runs.reduce((sum, r) => sum + r.score, 0) / runs.length;
