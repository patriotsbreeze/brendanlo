"use client";

import { OP_NAME, OPS, type Op } from "../_lib/problems";
import type { Run } from "../_lib/runs";
import { meanMs, missRate, opTally, trend, type Period, type Stats } from "../_lib/stats";
import { clock, shortDay } from "./chartKit";
import { pace, pct, secs } from "./statsKit";

/** Each operation in the period: how many, how fast, how clean, against the
 * period before, and a line through the period. */
export function OpTable({
  stats,
  before,
  runs,
  period,
}: {
  stats: Stats;
  /** The period before with runs in it, if there is one. */
  before: Stats | null;
  /** The runs in the period, oldest first. */
  runs: readonly Run[];
  period: Period;
}) {
  const ops = OPS.filter((op) => stats.ops[op]);
  const slowest = Math.max(...ops.map((op) => meanMs(stats.ops[op]!) ?? 0), 1);
  const points = trend(runs, period);
  const lines = points.map((p) => opTally(p.runs));

  return (
    <div className="scroll">
      <table className="rows opTable">
        <thead>
          <tr>
            <th scope="col">operation</th>
            <th scope="col" className="right">
              solved
            </th>
            <th scope="col">s a problem</th>
            {before && <th scope="col">than before</th>}
            <th scope="col" className="right">
              wrong first
            </th>
            {points.length > 1 && <th scope="col">over the {period.span === "day" ? "day" : "period"}</th>}
          </tr>
        </thead>
        <tbody>
          {ops.map((op) => {
            const t = stats.ops[op]!;
            const mean = meanMs(t);
            const prior = before?.ops[op];
            return (
              <tr key={op}>
                <th scope="row">{OP_NAME[op]}</th>
                <td className="right">{t.n}</td>
                <td className="barCell">
                  <span className="bar" style={{ width: `${((mean ?? 0) / slowest) * 4.5}rem` }} />
                  {secs(mean)}
                </td>
                {before && <td className="note">{prior ? pace(mean, meanMs(prior)) : "–"}</td>}
                <td className="right">{pct(missRate(t))}</td>
                {points.length > 1 && (
                  <td>
                    <Spark
                      op={op}
                      values={lines.map((l) => (l[op] ? meanMs(l[op]) : null))}
                      labels={points.map((p) =>
                        period.span === "day" ? clock(p.runs[0]) : p.from === p.to ? shortDay(p.from) : `from ${shortDay(p.from)}`,
                      )}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const W = 132;
const H = 26;

/** One operation's seconds a problem across the period. Up is slower. Gaps are
 * stretches with none of it. */
function Spark({ op, values, labels }: { op: Op; values: (number | null)[]; labels: string[] }) {
  const seen = values.filter((v): v is number => v !== null);
  if (seen.length === 0) return null;
  const lo = Math.min(...seen);
  const hi = Math.max(...seen);
  const x = (i: number) => (values.length === 1 ? W / 2 : 3 + (i / (values.length - 1)) * (W - 6));
  const y = (v: number) => (hi === lo ? H / 2 : 3 + (1 - (v - lo) / (hi - lo)) * (H - 6));
  const runs: string[] = [];
  let open = "";
  values.forEach((v, i) => {
    if (v === null) {
      if (open) runs.push(open);
      open = "";
    } else open += `${open ? " " : ""}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (open) runs.push(open);
  const last = values.findLastIndex((v) => v !== null);
  return (
    <svg
      className="spark"
      width={W}
      height={H}
      role="img"
      aria-label={`${OP_NAME[op]}, seconds a problem: from ${secs(seen[0])} to ${secs(seen[seen.length - 1])}, fastest ${secs(lo)}, slowest ${secs(hi)}`}
    >
      {runs.map((pts) =>
        pts.includes(" ") ? <polyline key={pts} className="sparkLine" points={pts} /> : null,
      )}
      {values.map((v, i) =>
        v === null ? null : (
          <circle key={i} className={i === last ? "sparkDot last" : "sparkDot"} cx={x(i)} cy={y(v)} r={i === last ? 2.5 : 1.5}>
            <title>{`${labels[i]}: ${secs(v)} s`}</title>
          </circle>
        ),
      )}
    </svg>
  );
}
