"use client";

import Link from "next/link";
import { useId, type CSSProperties } from "react";
import { GROUPS } from "../_lib/kinds";
import type { Op } from "../_lib/problems";
import { heldBack, meanMs, MIN_ANSWERS, missRate, SLOWER, type KindTally, type Stats } from "../_lib/stats";
import { TRICKS } from "../_lib/tricks";
import { opWord, pct, secs } from "./statsKit";

/** Closer than this, in whole percent, and the two paces read as the same. */
const SAME = 2;

/** The scale runs at least this far past the operation's pace, so its line
 * never sits at the very end of the bars. */
const HEADROOM = 1.5;

const TITLE = new Map(TRICKS.map((t) => [t.id, t.title]));

type Row = {
  k: KindTally;
  /** ms an answer. */
  mean: number;
  /** Against the whole operation, in whole percent: 18 is 18% slower. */
  diff: number;
  few: boolean;
  slow: boolean;
};

function rowOf(k: KindTally, base: number): Row {
  const mean = k.ms / k.n;
  const few = k.n < MIN_ANSWERS;
  return {
    k,
    mean,
    diff: Math.round((mean / base - 1) * 100),
    few,
    // weakSpots' rule, so a red bar is a kind one bad minute could not put there.
    slow: !few && heldBack(k, base) >= SLOWER,
  };
}

/** "+18%", "−7%" (a real minus), or "same". */
function against(diff: number): string {
  if (Math.abs(diff) <= SAME) return "same";
  return diff > 0 ? `+${diff}%` : `−${-diff}%`;
}

/** The same thing in words, for a screen reader, which reads "+" as "plus". */
function againstWords(r: Row): string {
  const said =
    Math.abs(r.diff) <= SAME ? "same" : `${Math.abs(r.diff)}% ${r.diff > 0 ? "slower" : "faster"}`;
  if (r.few) return `${said}, few answers`;
  return r.slow ? `${said}, and clearly so` : said;
}

/** One operation split by kind of problem, a table for each way of splitting
 * it. Every bar is on one scale, so the tables compare with each other, and a
 * line through them marks the operation's own pace. */
export function KindTable({ stats, op }: { stats: Stats; op: Op }) {
  const id = useId();
  const whole = stats.answered[op];
  const mean = whole ? meanMs(whole) : null;
  if (!whole || mean === null) {
    return <p className="note">no {opWord(op)} answers were kept in this period.</p>;
  }

  // At least 1 ms, so nothing below divides by zero.
  const base = Math.max(mean, 1);
  const rows = stats.kinds.filter((k) => k.kind.op === op && k.n > 0).map((k) => rowOf(k, base));
  // One slow answer in a kind of its own would squash every other bar, so the
  // scale ends at the slowest kind with enough answers to go on. Anything past
  // that is cut short and marked as cut.
  const top = Math.max(base * HEADROOM, ...rows.filter((r) => !r.few).map((r) => r.mean));
  const groups = GROUPS[op]
    .map((group) => ({ group, rows: rows.filter((r) => r.k.kind.group.key === group.key) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="kindTable" style={{ "--kind-at": (base / top).toFixed(4) } as CSSProperties}>
      <p>
        {opWord(op)} averages {secs(base)} s a problem over {whole.n}{" "}
        {whole.n === 1 ? "answer" : "answers"}.
      </p>
      {groups.map(({ group, rows }) => (
        <Group key={group.key} id={`${id}${group.key}`} name={group.name} rows={rows} top={top} />
      ))}
    </div>
  );
}

function Group({ id, name, rows, top }: { id: string; name: string; rows: Row[]; top: number }) {
  return (
    <div className="kindGroup">
      <h3 id={id}>{name}</h3>
      <div className="scroll">
        <table className="rows kindRows" aria-labelledby={id}>
          <thead>
            <tr>
              <th scope="col" className="kindLabel">
                <span className="srOnly">kind</span>
              </th>
              <th scope="col" className="right kindCount">
                answers
              </th>
              <th scope="col" className="kindBar">
                s a problem
              </th>
              <th scope="col" className="kindAgainst">
                against average
              </th>
              <th scope="col" className="right kindMiss">
                wrong first
              </th>
              <th scope="col" className="kindTrick">
                a faster way
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const trick = r.k.trick;
              const title = trick ? TITLE.get(trick) : undefined;
              const bar = ["bar", r.slow ? "kindSlow" : r.few ? "kindFaint" : "", r.mean > top ? "kindOver" : ""];
              return (
                <tr key={r.k.kind.id}>
                  <th scope="row" className="kindLabel">
                    {r.k.kind.label}
                  </th>
                  <td className="right">{r.k.n}</td>
                  <td className="kindBar">
                    <span className="kindTrack" aria-hidden="true">
                      <span
                        className={bar.filter(Boolean).join(" ")}
                        style={{ width: `${Math.min(r.mean / top, 1) * 100}%` }}
                      />
                    </span>
                    {secs(r.mean)}
                    <span className="kindPace" aria-hidden="true" />
                  </td>
                  <td className={r.slow ? "kindAgainst kindStrong" : "kindAgainst"}>
                    <span aria-hidden="true">
                      {r.few ? (
                        <>
                          <span className="kindSoft">{against(r.diff)}</span>{" "}
                          <span className="note kindFew">few answers</span>
                        </>
                      ) : (
                        against(r.diff)
                      )}
                    </span>
                    <span className="srOnly">{againstWords(r)}</span>
                  </td>
                  <td className="right kindMiss">{pct(missRate(r.k))}</td>
                  <td className="kindTrick">
                    {trick && title && (
                      <Link href={`/zetamath/tricks#${trick}`}>{title}</Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
