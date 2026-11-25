"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { describeKey, OP_NAME, OPS, show, STANDARD_KEY } from "../_lib/problems";
import { trickFor } from "../_lib/tricks";
import { KeepRun } from "./Account";
import { useRuns, type Result as RunResult } from "./RunsProvider";
import { Tape } from "./Tape";

type Props = { result: RunResult; onAgain: () => void; onSettings: () => void };

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function Result({ result, onAgain, onSettings }: Props) {
  const { status, account, runs, ownerRuns, record, setExcluded } = useRuns();
  const { run, solved } = result;
  const recorded = runs.find((r) => r.id === run.id);
  const again = useRef<HTMLButtonElement>(null);
  const excluded = recorded?.excluded ?? false;

  // Whoever was mid-answer at the buzzer is still typing. Wait a beat before
  // enter can start the next run. Also after logging in from here, whose form has
  // just gone away.
  useEffect(() => {
    const t = setTimeout(() => {
      const on = document.activeElement;
      if (!(on instanceof HTMLInputElement)) again.current?.focus({ preventScroll: true });
    }, 700);
    return () => clearTimeout(t);
  }, [run.id, account?.username]);

  const slowest = useMemo(
    () => [...solved].sort((a, b) => b.ms - a.ms).slice(0, 5),
    [solved],
  );
  const slow = useMemo(() => new Set(slowest), [slowest]);

  // Compared with the other counted runs on these same settings: your own, or
  // the owner's if you are not logged in.
  const rivals = (account ? runs : ownerRuns).filter(
    (r) => r.settings === run.settings && !r.excluded && r.id !== run.id,
  );
  const best = rivals.length ? Math.max(...rivals.map((r) => r.score)) : null;
  const today = rivals.filter((r) => r.day === run.day);
  const bestToday = today.length ? Math.max(...today.map((r) => r.score)) : null;

  const ops = OPS.flatMap((op) => {
    const [n, ms] = run.ops[op] ?? [0, 0];
    return n ? [{ op, n, each: ms / n }] : [];
  });
  const worst = Math.max(...ops.map((o) => o.each), 1);

  return (
    <section className="result" aria-label="result">
      <p className="score">
        <b>{run.score}</b> solved in {run.seconds} seconds
        {run.settings !== STANDARD_KEY && <span className="note"> ({describeKey(run.settings)})</span>}
      </p>
      <p className="lede">
        {status === "ready" && comparison(run.score, best, bestToday, account !== null)}
        {run.score > 0 && ` ${secs((run.seconds * 1000) / run.score)} a problem.`}
      </p>

      <div className="startRow">
        <button ref={again} type="button" className="button" onClick={onAgain}>
          go again
        </button>
        <button type="button" className="link" onClick={onSettings}>
          settings
        </button>
      </div>

      {!recorded && result.keptBy ? (
        result.keptBy !== account?.username && (
          <p className="note exclude">kept for {result.keptBy}.</p>
        )
      ) : account && !recorded ? (
        <div className="note exclude">
          not recorded.{" "}
          <button type="button" className="link" onClick={() => record(run)}>
            save this run
          </button>
        </div>
      ) : account ? (
        <label className="check exclude">
          <input
            type="checkbox"
            checked={excluded}
            onChange={(e) => setExcluded(run.id, e.target.checked)}
          />
          leave this run out of the graphs
        </label>
      ) : (
        <KeepRun key={run.id} run={run} />
      )}

      {solved.length > 0 && (
        <>
          <Tape solved={solved} total={run.seconds * 1000} elapsed={run.seconds * 1000} slow={slow} />
          <p className="caption">
            every answer, when it landed. the five slowest are in red.
          </p>

          <div className="split">
            <div>
              <h2>slowest five</h2>
              <table className="rows">
                <thead>
                  <tr>
                    <th scope="col">problem</th>
                    <th scope="col" className="right">
                      took
                    </th>
                    <th scope="col">a faster way</th>
                  </tr>
                </thead>
                <tbody>
                  {slowest.map((s, i) => {
                    const trick = trickFor(s.problem);
                    return (
                      <tr key={i}>
                        <td className="mono">
                          {show(s.problem)} = {s.problem.answer}
                        </td>
                        <td className="right">{secs(s.ms)}</td>
                        <td>
                          {trick ? (
                            <Link href={`/zetamath/tricks#${trick.id}`}>{trick.title}</Link>
                          ) : (
                            <span className="note">no trick for this one</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <h2>time per problem</h2>
              <table className="rows bars">
                <tbody>
                  {ops.map(({ op, n, each }) => (
                    <tr key={op}>
                      <th scope="row">
                        {OP_NAME[op]} <span className="note">×{n}</span>
                      </th>
                      <td>
                        <span className="bar" style={{ width: `${(each / worst) * 62}%` }} />
                        {secs(each)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function comparison(score: number, best: number | null, today: number | null, own: boolean) {
  if (best === null) return own ? "first run on these settings." : "";
  if (own) {
    if (score > best) return `new best, up from ${best}.`;
    if (today === null) return `first of the day. best ever is ${best}.`;
    if (score > today) return `best today, up from ${today}. best ever is ${best}.`;
    return `best today is ${today}, best ever is ${best}.`;
  }
  if (score > best) return `you beat brendan's best (${best}).`;
  if (score === best) return `tied with brendan's best.`;
  return `brendan's best is ${best}.`;
}
