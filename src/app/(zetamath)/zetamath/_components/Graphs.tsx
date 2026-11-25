"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { describeKey, OP_NAME, OPS, STANDARD_KEY } from "../_lib/problems";
import { byDay, DAY_MS, dayKey, dayToMs, trailingMean, type Run } from "../_lib/runs";
import { AttemptChart, WINDOW } from "./AttemptChart";
import { clock, scoreDomain, shortDay } from "./chartKit";
import { DayChart } from "./DayChart";
import { useRuns } from "./RunsProvider";

const RANGES = [
  ["30", "last 30 days"],
  ["90", "last 90 days"],
  ["all", "all time"],
] as const;

const PAGE = 20;

export function Graphs() {
  const { status, runs, owner } = useRuns();
  const [range, setRange] = useState<(typeof RANGES)[number][0]>("all");
  const [picked, setPicked] = useState<string | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [today] = useState(() => dayKey(Date.now()));

  // Scores on different settings do not belong on one axis, so the page shows
  // one kind at a time, standard first. A kind with nothing but left-out runs
  // is listed only for the owner, who can put them back.
  const kinds = useMemo(() => {
    const count = new Map<string, number>([[STANDARD_KEY, 0]]);
    for (const r of runs) {
      if (owner || !r.excluded) count.set(r.settings, (count.get(r.settings) ?? 0) + 1);
    }
    return [...count.entries()].sort(([a, n], [b, m]) =>
      a === STANDARD_KEY ? -1 : b === STANDARD_KEY ? 1 : m - n,
    );
  }, [runs, owner]);
  const fallback = kinds[0][1] > 0 ? STANDARD_KEY : (kinds[1]?.[0] ?? STANDARD_KEY);
  const kind = picked !== null && kinds.some(([key]) => key === picked) ? picked : fallback;

  if (status === "loading") return <p className="lede holding">loading runs…</p>;

  if (runs.length === 0) {
    return (
      <div className="holding">
        <h1>{status === "error" ? "couldn't load the runs." : "no runs yet."}</h1>
        <p className="lede">
          {status === "error" ? (
            "the database didn't answer. reload to try again."
          ) : owner ? (
            <>
              finish one on the <Link href="/zetamath">play tab</Link> and it shows up here.
            </>
          ) : (
            "brendan hasn't recorded one yet."
          )}
        </p>
      </div>
    );
  }

  const since = range === "all" ? -Infinity : dayToMs(today) - (Number(range) - 1) * DAY_MS;
  const everything = runs.filter((r) => r.settings === kind);
  const history = everything.filter((r) => !r.excluded);
  const inView = everything.filter((r) => dayToMs(r.day) >= since);
  const counted = inView.filter((r) => !r.excluded);
  const excluded = inView.filter((r) => r.excluded);
  const shown = showExcluded ? inView : counted;
  const before = (showExcluded ? everything : history).length - shown.length;

  return (
    <>
      {status === "error" && (
        <p role="status" className="note loadNote">
          couldn&rsquo;t load the recorded runs, so some may be missing. reload to try again.
        </p>
      )}
      <div className="filters">
        <label>
          <span className="srOnly">date range</span>
          <select value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
            {RANGES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {kinds.length > 1 && (
          <label>
            <span className="srOnly">settings</span>
            <select value={kind} onChange={(e) => setPicked(e.target.value)}>
              {kinds.map(([key, n]) => (
                <option key={key} value={key}>
                  {describeKey(key)} ({n})
                </option>
              ))}
            </select>
          </label>
        )}
        {counted.length > 0 && excluded.length > 0 && (
          <label className="check">
            <input
              type="checkbox"
              checked={showExcluded}
              onChange={(e) => setShowExcluded(e.target.checked)}
            />
            show {excluded.length} left out
          </label>
        )}
      </div>

      {counted.length === 0 ? (
        <p className="lede holding">nothing to graph in this range.</p>
      ) : (
        <Figures
          history={history}
          counted={counted}
          shown={shown}
          before={before}
          excluded={showExcluded ? excluded : []}
          today={today}
        />
      )}

      <RunTable key={`${kind} ${range}`} runs={inView} />
    </>
  );
}

function Figures({
  history,
  counted,
  shown,
  before,
  excluded,
  today,
}: {
  /** Every counted run on these settings, whatever the date range. */
  history: readonly Run[];
  /** The ones in the date range. */
  counted: readonly Run[];
  /** What the attempt chart draws: counted, plus left-out runs if asked. */
  shown: readonly Run[];
  before: number;
  excluded: readonly Run[];
  today: string;
}) {
  const days = byDay(counted);
  const bestIds = new Set(days.map((d) => d.best.id));
  const trailing = trailingMean(history.map((r) => r.score), WINDOW);
  const means = new Map(
    history.map((r, i) => [r.id, { mean: trailing[i], n: Math.min(WINDOW, i + 1) }]),
  );
  const domain = scoreDomain([
    ...shown.map((r) => r.score),
    ...counted.flatMap((r) => means.get(r.id)?.mean ?? []),
  ]);
  const best = history.reduce((top, r) => (r.score > top.score ? r : top));
  const lastDay = days[days.length - 1];
  const lastTen = history.slice(-WINDOW);
  const avg = lastTen.reduce((sum, r) => sum + r.score, 0) / lastTen.length;

  const speed = OPS.flatMap((op) => {
    let n = 0;
    let ms = 0;
    for (const r of counted) {
      n += r.ops[op]?.[0] ?? 0;
      ms += r.ops[op]?.[1] ?? 0;
    }
    return n ? [{ op, each: ms / n / 1000 }] : [];
  });
  const slowest = Math.max(...speed.map((s) => s.each), 0.1);

  return (
    <>
      <dl className="stats">
        <Stat label="best ever" value={String(best.score)} note={shortDay(best.day)} />
        <Stat
          label={lastDay.day === today ? "best today" : `best on ${shortDay(lastDay.day)}`}
          value={String(lastDay.best.score)}
          note={`${lastDay.runs.length} ${lastDay.runs.length === 1 ? "try" : "tries"}`}
        />
        <Stat
          label={`average of last ${lastTen.length}`}
          value={avg.toFixed(1)}
          note={avg ? `${(lastTen[0].seconds / avg).toFixed(2)} s a problem` : ""}
        />
        <Stat
          label="tries"
          value={String(counted.length)}
          note={`over ${days.length} ${days.length === 1 ? "day" : "days"}`}
        />
      </dl>

      <figure>
        <figcaption>
          <h2>each day</h2>
          <ul className="legend">
            <li>
              <span className="swatch best" /> best of the day
            </li>
            <li>
              <span className="swatch try" /> every other try
            </li>
            {excluded.length > 0 && (
              <li>
                <span className="swatch excluded" /> left out
              </li>
            )}
          </ul>
        </figcaption>
        <DayChart days={days} excluded={excluded} domain={domain} />
      </figure>

      <figure>
        <figcaption>
          <h2>every attempt</h2>
          <ul className="legend">
            <li>
              <span className="swatch mean" /> average of last {WINDOW}
            </li>
            <li>
              <span className="swatch best" /> best of its day
            </li>
            <li>
              <span className="swatch try" /> attempt
            </li>
            {excluded.length > 0 && (
              <li>
                <span className="swatch excluded" /> left out
              </li>
            )}
          </ul>
        </figcaption>
        <AttemptChart runs={shown} bestIds={bestIds} means={means} before={before} domain={domain} />
      </figure>

      {speed.length > 1 && (
        <figure>
          <figcaption>
            <h2>seconds per problem</h2>
          </figcaption>
          <table className="rows bars">
            <tbody>
              {speed.map(({ op, each }) => (
                <tr key={op}>
                  <th scope="row">{OP_NAME[op]}</th>
                  <td>
                    <span className="bar" style={{ width: `${(each / slowest) * 72}%` }} />
                    {each.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <b>{value}</b>
        <span className="note">{note}</span>
      </dd>
    </div>
  );
}

function RunTable({ runs }: { runs: readonly Run[] }) {
  const { owner, setExcluded } = useRuns();
  const [limit, setLimit] = useState(PAGE);
  const newest = [...runs].reverse();
  if (newest.length === 0) return null;
  return (
    <section>
      <h2>the runs</h2>
      <table className="rows runs">
        <thead>
          <tr>
            <th scope="col">day</th>
            <th scope="col">time</th>
            <th scope="col" className="right">
              score
            </th>
            <th scope="col" className="right">
              s a problem
            </th>
            <th scope="col" className="right">
              {owner ? "leave out" : ""}
            </th>
          </tr>
        </thead>
        <tbody>
          {newest.slice(0, limit).map((r) => (
            <tr key={r.id} className={r.excluded ? "out" : undefined}>
              <td>{shortDay(r.day)}</td>
              <td>{clock(r)}</td>
              <td className="right">{r.score}</td>
              <td className="right">{r.score ? (r.seconds / r.score).toFixed(2) : ""}</td>
              <td className="right">
                {owner ? (
                  <input
                    type="checkbox"
                    aria-label={`leave out the ${r.score} from ${shortDay(r.day)}, ${clock(r)}`}
                    checked={r.excluded}
                    onChange={(e) => setExcluded(r.id, e.target.checked)}
                  />
                ) : r.excluded ? (
                  "left out"
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {limit < newest.length && (
        <button type="button" className="link" onClick={() => setLimit((n) => n + 100)}>
          show more ({newest.length - limit})
        </button>
      )}
    </section>
  );
}
