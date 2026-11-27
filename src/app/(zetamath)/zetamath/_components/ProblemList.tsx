"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Op } from "../_lib/problems";
import { meanMs, type ProblemTally, type Stats } from "../_lib/stats";
import { trickFor } from "../_lib/tricks";
import { opWord, secs, solvedText } from "./statsKit";

type Sort = "slow" | "wrong" | "seen";

const SORTS: readonly (readonly [Sort, string])[] = [
  ["slow", "slowest"],
  ["wrong", "most wrong"],
  ["seen", "most seen"],
];

/** The table's caption, for a screen reader: what order the rows are in. */
const ORDER_WORDS: Record<Sort, string> = {
  slow: "slowest first",
  wrong: "most often wrong first",
  seen: "most seen first",
};

const mean = (p: ProblemTally) => p.ms / p.n;

const ORDERS: Record<Sort, (x: ProblemTally, y: ProblemTally) => number> = {
  // With the same time, the one that came up more is the surer finding.
  slow: (x, y) => mean(y) - mean(x) || y.n - x.n,
  wrong: (x, y) =>
    y.missed - x.missed || y.missed / y.checked - x.missed / x.checked || mean(y) - mean(x),
  seen: (x, y) => y.n - x.n || mean(y) - mean(x),
};

const FIRST = 12;
const MORE = 50;

/** This many times the operation's own pace, or slower, and a problem stands
 * out, once it has come up more than once: one slow answer is just a slow
 * answer, and the slowest-first list would be nothing but red. */
const SLOW = 1.5;

const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);

function countLine(list: readonly ProblemTally[], repeats: number): string {
  if (list.length === 1) return `one problem came up, ${times(list[0].n)}.`;
  const start = `${list.length} different problems came up`;
  if (repeats === 0) return `${start}, each of them once.`;
  if (repeats === list.length) return `${start}, every one of them more than once.`;
  return `${start}, ${repeats} of them more than once.`;
}

/** The single facts of one operation in the period: which are slow, which go
 * wrong, which keep coming up, and a trick for each where there is one. */
export function ProblemList({ stats, op }: { stats: Stats; op: Op }) {
  const [sort, setSort] = useState<Sort>("slow");
  const [repeated, setRepeated] = useState(false);

  // A different list starts short again, even one that was opened up before:
  // going to "most wrong" and back to "slowest" shows 12 rows, not 62.
  const list = `${op} ${sort} ${repeated}`;
  const [page, setPage] = useState({ stats, list, limit: FIRST });
  const current = page.stats === stats && page.list === list;
  if (!current) setPage({ stats, list, limit: FIRST });
  const limit = current ? page.limit : FIRST;

  const body = useRef<HTMLTableSectionElement>(null);
  const all = useMemo(() => stats.problems.filter((p) => p.problem.op === op), [stats, op]);
  const rows = useMemo(
    () =>
      all
        .filter((p) => (!repeated || p.n >= 2) && (sort !== "wrong" || p.missed > 0))
        .sort(ORDERS[sort]),
    [all, sort, repeated],
  );

  if (all.length === 0) {
    return <p className="note">no {opWord(op)} answers were kept in this period.</p>;
  }

  const answered = stats.answered[op];
  const base = answered ? meanMs(answered) : null;
  const repeats = all.filter((p) => p.n >= 2).length;

  return (
    <>
      <p className="plIntro">{countLine(all, repeats)}</p>

      <div className="plControls">
        <div className="spans" role="group" aria-label="sort by">
          {SORTS.map(([s, word]) => (
            <button
              key={s}
              type="button"
              className="link"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
            >
              {word}
            </button>
          ))}
        </div>
        <label className="check plCheck">
          <input
            type="checkbox"
            checked={repeated}
            onChange={(e) => setRepeated(e.target.checked)}
          />
          seen more than once
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="note">
          {repeated && repeats === 0
            ? "no problem came up more than once in this period."
            : repeated
              ? "you got every problem you saw more than once right the first time."
              : "you got every one right the first time."}
        </p>
      ) : (
        <>
          <div className="scroll">
            <table className="rows plTable">
              <caption className="srOnly">
                {opWord(op)} problems, {ORDER_WORDS[sort]}
              </caption>
              <thead>
                <tr>
                  <th scope="col">problem</th>
                  <th scope="col" className="right">
                    seen
                  </th>
                  <th scope="col" className="right">
                    s on average
                  </th>
                  <th scope="col" className="right">
                    s at best
                  </th>
                  <th scope="col" className="right">
                    wrong first
                  </th>
                  <th scope="col" className="plTrick">
                    a faster way
                  </th>
                </tr>
              </thead>
              <tbody ref={body}>
                {rows.slice(0, limit).map((p) => {
                  const slow = base !== null && p.n >= 2 && mean(p) >= SLOW * base;
                  const trick = trickFor(p.problem);
                  return (
                    <tr key={p.key}>
                      <th scope="row" className={slow ? "plSlow" : undefined} tabIndex={-1}>
                        {solvedText(p.problem)}
                        {slow && (
                          <>
                            {" "}
                            {/* A word as well as the red, so it is not told by colour alone. */}
                            <span
                              className="plMark"
                              title={`each time, on average, at least ${SLOW} times your ${opWord(op)} average of ${secs(base)} s`}
                            >
                              slow
                            </span>
                          </>
                        )}
                      </th>
                      <td className="right">{p.n}</td>
                      <td className="right">{secs(mean(p))}</td>
                      <td className="right">{secs(p.best)}</td>
                      <td className="right">{p.missed ? `${p.missed} of ${p.checked}` : "–"}</td>
                      <td className="plTrick">
                        {trick ? (
                          <Link href={`/zetamath/tricks#${trick.id}`}>{trick.title}</Link>
                        ) : (
                          <span className="note">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {limit < rows.length && (
            <button
              type="button"
              className="link plMore"
              onClick={() => {
                // The button goes once everything shows, so focus moves to the
                // first new row instead of falling back to the page.
                flushSync(() => setPage({ stats, list, limit: limit + MORE }));
                body.current?.rows[limit]?.querySelector("th")?.focus();
              }}
            >
              show more ({rows.length - limit})
            </button>
          )}
        </>
      )}
    </>
  );
}
