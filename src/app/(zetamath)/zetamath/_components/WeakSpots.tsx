"use client";

import Link from "next/link";
import { OPS, type Op } from "../_lib/problems";
import { missRate, weakSpots, type Spot, type Stats } from "../_lib/stats";
import { TRICKS } from "../_lib/tricks";
import { opWord, pct, secs } from "./statsKit";

/** Fewer kept answers than this in a period and any ranking is mostly luck. */
const ENOUGH = 40;

/** ms a run. Below this a kind costs too little to be worth saying. */
const WORTH = 50;

const TITLES = new Map(TRICKS.map((t) => [t.id, t.title]));

/** "1.4": what a kind costs a run is a rough figure, so tenths are plenty. */
const tenths = (ms: number) => (ms / 1000).toFixed(1);

/** The kinds of problem that hold you up most in this period, worst first,
 * each with what it costs you and where to start on it. */
export function WeakSpots({ stats, onPick }: { stats: Stats; onPick: (op: Op) => void }) {
  const kept = OPS.reduce((n, op) => n + (stats.answered[op]?.n ?? 0), 0);

  if (stats.detailed === 0) {
    return (
      <p>
        no answers were kept for these runs, so there is nothing to break down yet. runs you play
        from now on are kept.
      </p>
    );
  }

  // Kept runs can still hold no answers: a run quit before the first one.
  if (kept === 0) {
    return (
      <p>
        these runs ended before any answers, so there is nothing to break down yet. play a few more
        runs, or pick a longer period.
      </p>
    );
  }

  if (kept < ENOUGH) {
    return (
      <p>
        only {kept} {kept === 1 ? "answer was" : "answers were"} kept in this period, too few to
        tell where you are slow. play a few more runs, or pick a longer period.
      </p>
    );
  }

  const spots = weakSpots(stats);
  if (spots.length === 0) {
    return (
      <p>
        nothing stands out. every kind of problem is within a few percent of its operation&rsquo;s
        pace.
      </p>
    );
  }

  // One scale for the whole list, so a longer bar is always a slower problem,
  // whatever the operation. Answers can be logged at 0 ms, so never divide by 0.
  const top = Math.max(1, ...spots.map((s) => Math.max(s.mean, s.base)));

  return (
    <>
      <ul className="legend wsLegend" aria-hidden="true">
        <li>
          <span className="wsKeyKind" /> this kind of problem
        </li>
        <li>
          <span className="wsKeyBase" /> its whole operation
        </li>
      </ul>
      {/* The numbers are drawn, not list markers, and Safari drops list
          semantics for an unmarked list unless it is told. */}
      <ol className="wsList" role="list">
        {spots.map((spot) => (
          <WeakSpot key={spot.kind.kind.id} spot={spot} top={top} onPick={onPick} />
        ))}
      </ol>
    </>
  );
}

function WeakSpot({ spot, top, onPick }: { spot: Spot; top: number; onPick: (op: Op) => void }) {
  const { kind, mean, base, cost } = spot;
  const op = kind.kind.op;
  const name = opWord(op);
  const misses = missRate(kind);
  const title = kind.trick ? TITLES.get(kind.trick) : undefined;

  const facts = [
    cost >= WORTH ? `costs about ${tenths(cost)} s a run` : null,
    misses === null ? null : misses === 0 ? "never wrong first" : `wrong first ${pct(misses)} of the time`,
    `from ${kind.n} answers`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <li>
      <div className="wsHead">
        {/* "carries" needs its operation; "7 × …" does not, but it reads the
            same either way, so every one gets it, quietly. */}
        <h3>
          {kind.kind.label} <span className="wsOp">in {name}</span>
        </h3>
        <button type="button" className="link wsCloser" onClick={() => onPick(op)}>
          look closer<span className="srOnly"> at {name}</span>
        </button>
      </div>
      <div className="wsSlow">
        {/* The sentence beside it says both numbers, so this is only for the eye. */}
        <span className="wsScale" aria-hidden="true">
          <span className="wsKind" style={{ width: `${(mean / top) * 100}%` }} />
          <span className="wsBase" style={{ left: `${(base / top) * 100}%` }} />
        </span>
        <span>
          {secs(mean)} s a problem, against {secs(base)} s for {name}
        </span>
      </div>
      <p className="note wsFacts">{facts}</p>
      <p className="wsFix">
        {title ? (
          <>
            try: <Link href={`/zetamath/tricks#${kind.trick}`}>{title}</Link>
          </>
        ) : (
          <Link href={`/zetamath/tricks#${op}`}>tricks for {name}</Link>
        )}
      </p>
    </li>
  );
}
