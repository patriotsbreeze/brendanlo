"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { describeKey, OP_NAME, OPS, STANDARD_KEY, type Op } from "../_lib/problems";
import { dayKey, dayToMs } from "../_lib/runs";
import {
  meanMs,
  missRate,
  periodOf,
  SPANS,
  stepTo,
  tally,
  weakSpots,
  within,
  type Span,
} from "../_lib/stats";
import { EnterForm } from "./Account";
import { Stat } from "./Graphs";
import { KindTable } from "./KindTable";
import { OpTable } from "./OpTable";
import { ProblemList } from "./ProblemList";
import { ProblemMap } from "./ProblemMap";
import { useRuns } from "./RunsProvider";
import { WeakSpots } from "./WeakSpots";
import { paceNote, pct, periodLabel, secs, versusLabel } from "./statsKit";

const SPAN_WORDS: Record<Span, string> = { day: "day", week: "week", month: "month", all: "all time" };

const ALL_SETTINGS = "all";

/** What the address says to show, checked, because anyone can type one. */
type View = { span: Span; day: string | null; settings: string; op: Op | null };

function readView(params: URLSearchParams): View {
  const span = SPANS.find((s) => s === params.get("span")) ?? "all";
  const day = params.get("day");
  // "2026-13-01" fits the pattern but is no date, and formatting it throws.
  const ms = day !== null && /^\d{4}-\d{2}-\d{2}$/.test(day) ? dayToMs(day) : NaN;
  const real = Number.isFinite(ms) && new Date(ms).toISOString().startsWith(day as string);
  return {
    span,
    day: real ? day : null,
    settings: params.get("settings") ?? ALL_SETTINGS,
    op: OPS.find((op) => op === params.get("op")) ?? null,
  };
}

export function Stats() {
  const { status, account, runs } = useRuns();
  const params = useSearchParams();
  const [today] = useState(() => dayKey(Date.now()));
  const view = readView(params);

  /** The address is the state, so a reload or a link lands on the same view. */
  const show = (next: Partial<View>) => {
    const q = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === undefined) q.delete(key);
      else q.set(key, value);
    }
    window.history.replaceState(null, "", `?${q.toString()}`);
  };

  // The login form is gone once it works, so move to what took its place.
  const heading = useRef<HTMLHeadingElement>(null);
  const name = account?.username ?? null;
  const before = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (status === "loading") return;
    if (before.current !== undefined && before.current !== name) heading.current?.focus();
    before.current = name;
  }, [status, name]);

  const kinds = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of runs) if (!r.excluded) count.set(r.settings, (count.get(r.settings) ?? 0) + 1);
    return [...count.entries()].sort(([a, n], [b, m]) =>
      a === STANDARD_KEY ? -1 : b === STANDARD_KEY ? 1 : m - n,
    );
  }, [runs]);
  const settings = kinds.some(([key]) => key === view.settings) ? view.settings : ALL_SETTINGS;

  // Left-out runs stay out here too: they were left out for a reason.
  const counted = useMemo(
    () => runs.filter((r) => !r.excluded && (settings === ALL_SETTINGS || r.settings === settings)),
    [runs, settings],
  );
  const played = useMemo(() => [...new Set(counted.map((r) => r.day))].sort(), [counted]);
  // Unless told otherwise, the last day played: today, if there was a run today.
  const anchor = view.day ?? played.at(-1) ?? today;
  const period = useMemo(() => periodOf(view.span, anchor), [view.span, anchor]);
  const inPeriod = useMemo(() => counted.filter((r) => within(r.day, period)), [counted, period]);
  const stats = useMemo(() => tally(inPeriod), [inPeriod]);
  // Compared with the nearest period before that has runs, not an empty one.
  const prior = useMemo(() => stepTo(period, -1, played), [period, played]);
  const priorStats = useMemo(
    () => (prior ? tally(counted.filter((r) => within(r.day, prior))) : null),
    [counted, prior],
  );
  const spots = useMemo(() => weakSpots(stats), [stats]);

  if (status === "loading") return <p className="lede holding">loading runs…</p>;

  if (!account && status === "ready") {
    return (
      <div className="holding">
        <h1 ref={heading} tabIndex={-1}>
          log in to see your stats.
        </h1>
        <p className="lede">every account has its own, and nobody else can open them.</p>
        <EnterForm />
      </div>
    );
  }

  if (counted.length === 0) {
    // Settings only offer what has counted runs, so this is no runs, or every
    // one of them left out.
    const allOut = runs.length > 0 && status !== "error";
    return (
      <div className="holding">
        <h1 ref={heading} tabIndex={-1}>
          {status === "error" ? "couldn't load the runs." : allOut ? "every run is left out." : "no runs yet."}
        </h1>
        <p className="lede">
          {status === "error" ? (
            "the database didn't answer. reload to try again."
          ) : allOut ? (
            <>
              put some back on the <Link href="/zetamath/graphs">graphs tab</Link> to see them here.
            </>
          ) : (
            <>
              finish one on the <Link href="/zetamath">play tab</Link> and its answers show up here.
            </>
          )}
        </p>
      </div>
    );
  }

  // Stepping lands on the day played, not the first of the week or month, so
  // a narrower span picked next still has runs in it.
  const earlierDay = played.findLast((d) => d < period.from);
  const laterDay = period.span === "all" ? undefined : played.find((d) => d > period.to);
  const earlier = earlierDay === undefined ? null : periodOf(view.span, earlierDay);
  const later = laterDay === undefined ? null : periodOf(view.span, laterDay);
  const total = stats.total;
  const pastTotal = priorStats?.total ?? null;
  const solved = inPeriod.reduce((n, r) => n + r.score, 0);
  // Typed in from a score sheet: a score, and no times at all.
  const untimed = inPeriod.filter((r) => r.score > 0 && Object.keys(r.ops).length === 0).length;
  const older = inPeriod.filter((r) => !r.answers && Object.keys(r.ops).length > 0).length;
  // Looked at closer: the one picked, or where the worst weak spot is, or the
  // slowest operation.
  const closerOps = OPS.filter((o) => stats.answered[o]);
  const slowestOp = [...closerOps].sort(
    (a, b) => (meanMs(stats.answered[b]!) ?? 0) - (meanMs(stats.answered[a]!) ?? 0),
  )[0];
  const op = view.op && closerOps.includes(view.op) ? view.op : (spots[0]?.kind.kind.op ?? slowestOp);

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="srOnly">
        your stats
      </h1>
      {status === "error" && (
        <p role="status" className="note loadNote">
          couldn&rsquo;t load the recorded runs, so some may be missing. reload to try again.
        </p>
      )}

      <div className="filters">
        <div className="spans" role="group" aria-label="period">
          {SPANS.map((s) => (
            <button
              key={s}
              type="button"
              className="link"
              aria-pressed={view.span === s}
              onClick={() => show({ span: s })}
            >
              {SPAN_WORDS[s]}
            </button>
          ))}
        </div>
        {kinds.length > 1 && (
          <label>
            <span className="srOnly">settings</span>
            <select value={settings} onChange={(e) => show({ settings: e.target.value })}>
              <option value={ALL_SETTINGS}>
                every setting ({kinds.reduce((n, [, m]) => n + m, 0)})
              </option>
              {kinds.map(([key, n]) => (
                <option key={key} value={key}>
                  {describeKey(key)} ({n})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="periodRow">
        {period.span !== "all" && (
          <button
            type="button"
            className="link step"
            // Not disabled: that would drop the focus of whoever just stepped here.
            aria-disabled={!earlier}
            aria-label={earlier ? `back to ${periodLabel(earlier, today)}` : "nothing earlier"}
            onClick={() => earlierDay && show({ day: earlierDay })}
          >
            ‹
          </button>
        )}
        <h2 aria-live="polite">{periodLabel(period, today)}</h2>
        {period.span !== "all" && (
          <button
            type="button"
            className="link step"
            aria-disabled={!later}
            aria-label={later ? `on to ${periodLabel(later, today)}` : "nothing later"}
            onClick={() => laterDay && show({ day: laterDay })}
          >
            ›
          </button>
        )}
        {period.span === "all" && played.length > 0 && (
          <span className="note">since {periodLabel(periodOf("day", played[0]), today)}</span>
        )}
      </div>

      {stats.runs === 0 ? (
        <p className="lede holding">
          no runs {view.span === "all" ? "yet" : `in this ${view.span}`}.{" "}
          {played.length > 0 && (
            <button type="button" className="link" onClick={() => show({ day: played.at(-1) })}>
              go to the last day played
            </button>
          )}
        </p>
      ) : (
        <>
          <dl className="stats">
            <Stat
              label="solved"
              value={String(solved)}
              note={`in ${stats.runs} ${stats.runs === 1 ? "run" : "runs"}${stats.days > 1 ? ` over ${stats.days} days` : ""}`}
            />
            <Stat
              label="s a problem"
              value={secs(meanMs(total))}
              note={
                meanMs(total) === null
                  ? "no times for these runs"
                  : prior && pastTotal
                    ? paceNote(meanMs(total), meanMs(pastTotal), versusLabel(prior, period))
                    : ""
              }
            />
            <Stat
              label="wrong first"
              value={pct(missRate(total))}
              note={
                missRate(total) === null
                  ? "not kept for these runs"
                  : prior && pastTotal && missRate(pastTotal) !== null
                    ? `${pct(missRate(pastTotal))} for ${versusLabel(prior, period)}`
                    : `of ${total.checked} answers`
              }
            />
            <Stat
              label="best run"
              value={String(Math.max(...inPeriod.map((r) => r.score)))}
              note={settings === ALL_SETTINGS && kinds.length > 1 ? "on any setting" : `of ${stats.runs}`}
            />
          </dl>

          <section className="statPart">
            <h2>by operation</h2>
            <OpTable stats={stats} before={priorStats} runs={inPeriod} period={period} />
            <p className="caption">
              wrong first is how often a wrong digit went in before the right answer.
              {prior && priorStats ? ` before is ${versusLabel(prior, period)}.` : ""}
              {older > 0 &&
                ` ${older} of these runs ${older === 1 ? "is" : "are"} from before every answer was kept, so ${older === 1 ? "it counts" : "they count"} in the times above and nowhere below.`}
              {untimed > 0 &&
                ` ${untimed} ${untimed === 1 ? "was" : "were"} typed in by hand, with no times, so ${untimed === 1 ? "it counts" : "they count"} only in solved and best run.`}
            </p>
          </section>

          <section className="statPart">
            <h2>weak spots</h2>
            <WeakSpots
              stats={stats}
              onPick={(o) => {
                show({ op: o });
                // Down to it, and focus too, so a keyboard carries on from there.
                const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
                document.getElementById("closer")?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
                document.getElementById("closer-kinds")?.focus({ preventScroll: true });
              }}
            />
            {spots.length > 0 && (
              <p className="caption">
                kinds of problem clearly slower than the rest of their operation, slowest first. a
                kind needs a few answers to be listed, and would still be slow without its slowest
                one, so a single bad answer can&rsquo;t put it here. what it costs is the time it
                adds to an average run.
              </p>
            )}
          </section>

          {op && (
            <div id="closer" className="closer">
              <div className="closerBar">
                <span className="note">look closer at</span>
                <div className="spans" role="group" aria-label="operation to look closer at">
                  {closerOps.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="link"
                      aria-pressed={o === op}
                      onClick={() => show({ op: o })}
                    >
                      {OP_NAME[o]}
                    </button>
                  ))}
                </div>
              </div>

              <section className="statPart">
                <h2 id="closer-kinds" tabIndex={-1}>
                  {OP_NAME[op]}, by kind of problem
                </h2>
                <KindTable stats={stats} op={op} />
                <p className="caption">
                  the line through the bars is the average for {OP_NAME[op]}. +18% is 18% slower than
                  that average. red is clearly slower, with enough answers to say so.
                </p>
              </section>

              <section className="statPart">
                <h2>where the time goes in {OP_NAME[op]}</h2>
                <ProblemMap stats={stats} op={op} />
                <p className="caption">
                  every problem in its place by the two numbers the game picked, and the seconds it
                  took on average. the darker, the slower.
                </p>
              </section>

              <section className="statPart">
                <h2>{OP_NAME[op]} problems, one by one</h2>
                <ProblemList stats={stats} op={op} />
                <p className="caption">
                  red marks a problem that came up more than once and took at least 1.5 times your
                  average for {OP_NAME[op]}.
                  wrong first counts its answers that had a wrong digit go in before the right one.
                </p>
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}
