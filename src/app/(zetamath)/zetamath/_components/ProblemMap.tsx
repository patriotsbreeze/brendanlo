"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { OP_SIGN, type Op } from "../_lib/problems";
import { grid, type Bucket, type Cell, type Grid, type Stats } from "../_lib/stats";
import { opWord, secs, solvedText } from "./statsKit";

/* Where the time goes inside one operation, by the two numbers the game
 * picked. A table and not a picture, so every cell can be reached and read out. */

type Axis = { down: string; across: string; rows: string; cols: string };

// The same way round as AXES in stats.ts.
const AXIS: Record<Op, Axis> = {
  add: { down: "first", across: "second", rows: "first number", cols: "second number" },
  sub: { down: "taken away", across: "answer", rows: "number taken away", cols: "answer" },
  mul: { down: "first", across: "second", rows: "first number", cols: "second number" },
  div: { down: "divided by", across: "answer", rows: "number it is divided by", cols: "answer" },
};

const STEPS = [0, 1, 2, 3, 4] as const;
const LIST = 8;

const label = (b: Bucket) => (b.from === b.to ? String(b.from) : `${b.from}–${b.to}`);
const said = (b: Bucket) => (b.from === b.to ? String(b.from) : `${b.from} to ${b.to}`);
const tenths = (ms: number) => (ms / 1000).toFixed(1);
const each = (t: { n: number; ms: number }) => t.ms / t.n;

/** "7 × 60–69". Subtraction and division are mapped by what was taken away (or
 * divided by) against the answer, so they read as the problem with its first
 * number left out: "… ÷ 7 = 60–69". */
function nameOf(op: Op, row: string, col: string) {
  if (op === "add" || op === "mul") return `${row} ${OP_SIGN[op]} ${col}`;
  return `… ${OP_SIGN[op]} ${row} = ${col}`;
}

/** The same in words, since a screen reader may skip the signs and dashes. */
function sayOf(op: Op, row: string, col: string) {
  if (op === "add") return `${row} plus ${col}`;
  if (op === "mul") return `${row} times ${col}`;
  return `${op === "sub" ? "take away" : "divide by"} ${row}, answer ${col}`;
}

type Place = { key: string; i: number; j: number; cell: Cell; name: string; said: string; mean: number };

type Layout = {
  /** [row][col], like the grid. */
  at: (Place | null)[][];
  places: Map<string, Place>;
  first: Place;
  /** ms a problem at the light and the dark end of the scale. */
  lo: number;
  hi: number;
  /** The slowest cell with two answers or more, if one has. */
  slowest: Place | null;
  once: boolean;
};

function layout(map: Grid): Layout {
  const places = new Map<string, Place>();
  const at = map.cells.map((row, i) =>
    row.map((cell, j) => {
      if (!cell) return null;
      // Keyed by what the cell covers, so a pick still means something in
      // another period with the same slices.
      const [r, c] = [map.rows[i], map.cols[j]];
      const place: Place = {
        key: `${label(r)}|${label(c)}`,
        i,
        j,
        cell,
        name: nameOf(map.op, label(r), label(c)),
        said: sayOf(map.op, said(r), said(c)),
        mean: each(cell),
      };
      places.set(place.key, place);
      return place;
    }),
  );
  const all = [...places.values()];
  // One slow answer should not wash out the rest of the map, so the scale runs
  // between cells with more to go on, when there are enough of them.
  const steady = all.filter((p) => p.cell.n >= 2);
  const basis = steady.length >= 2 ? steady : all;
  const means = basis.map((p) => p.mean);
  const slowest = steady.reduce<Place | null>((top, p) => (!top || p.mean > top.mean ? p : top), null);
  return {
    at,
    places,
    first: all[0],
    lo: Math.min(...means),
    hi: Math.max(...means),
    slowest,
    once: all.some((p) => p.cell.n === 1),
  };
}

/** Which of the five shades, from the light end to the dark. */
function shade(mean: number, lo: number, hi: number) {
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(STEPS.length - 1, Math.floor(((mean - lo) / (hi - lo)) * STEPS.length)));
}

const MOVES: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** The next cell that way with something in it, skipping blanks. A sparse map
 * can leave a cell alone in its row and column, so left and right run on into
 * the next row, and up and down land on the nearest cell of the next row that
 * has one. That way every cell can be reached. */
function next(at: Layout["at"], i: number, j: number, di: number, dj: number): Place | null {
  const width = at[0].length;
  if (dj !== 0) {
    for (let k = i * width + j + dj; k >= 0 && k < at.length * width; k += dj) {
      const p = at[Math.floor(k / width)][k % width];
      if (p) return p;
    }
    return null;
  }
  for (let r = i + di; r >= 0 && r < at.length; r += di) {
    let near: Place | null = null;
    for (const p of at[r]) if (p && (!near || Math.abs(p.j - j) < Math.abs(near.j - j))) near = p;
    if (near) return near;
  }
  return null;
}

export function ProblemMap({ stats, op }: { stats: Stats; op: Op }) {
  const map = useMemo(() => grid(stats, op), [stats, op]);
  const view = useMemo(() => (map ? layout(map) : null), [map]);
  const [pinned, setPinned] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // The cell Tab lands on: one stop for the whole map, arrows within it.
  const [cursor, setCursor] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [mapOp, setMapOp] = useState(op);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  // The cell the mouse last came over. Its preview lasts until the mouse leaves
  // the map, so crossing the gaps between cells does not flash the panel.
  const hovered = useRef<string | null>(null);
  const panel = useId();

  // A pick in one operation means nothing in another.
  if (mapOp !== op) {
    setMapOp(op);
    setPinned(null);
    setPreview(null);
    setCursor(null);
    setOpen(null);
  }

  if (!map || !view) return <p className="note">no {opWord(op)} answers were kept in this period.</p>;

  const has = (key: string | null) => (key !== null && view.places.has(key) ? key : null);
  const picked = has(pinned);
  const home = has(cursor) ?? picked ?? view.first.key;
  const shownKey = has(preview) ?? picked;
  const shown = shownKey ? view.places.get(shownKey)! : null;
  const axis = AXIS[op];
  const slow = view.slowest;

  // Scrolled into view by hand: scrollIntoView keeps to the scroll-padding, so
  // a cell is not left in under the sticky row labels. focus() alone may not.
  const focus = (key: string) => {
    const el = buttons.current.get(key);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, p: Place) => {
    if (e.key === "Escape") {
      setPinned(null);
      return;
    }
    const move = MOVES[e.key];
    let to: Place | null = null;
    if (move) to = next(view.at, p.i, p.j, move[0], move[1]);
    else if (e.key === "Home") to = next(view.at, p.i, -1, 0, 1);
    else if (e.key === "End") to = next(view.at, p.i, map.cols.length, 0, -1);
    else return;
    e.preventDefault();
    if (to) focus(to.key);
  };

  // Only a mouse previews on hover. A tap goes straight to a pick.
  const enter = (e: PointerEvent, key: string) => {
    if (e.pointerType !== "mouse") return;
    hovered.current = key;
    setPreview(key);
  };
  // A cell focused since then keeps its preview.
  const leave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const key = hovered.current;
    hovered.current = null;
    setPreview((k) => (k === key ? null : k));
  };

  return (
    <>
      {(view.hi > view.lo || view.once) && (
        <div className="pmLegend">
          {view.hi > view.lo && (
            <span className="pmKey">
              <span>faster, {secs(view.lo)} s</span>
              <span className="pmRamp" aria-hidden="true">
                {STEPS.map((s) => (
                  <span key={s} className={`pmSwatch pmS${s}`} />
                ))}
              </span>
              <span>{secs(view.hi)} s, slower</span>
            </span>
          )}
          {view.once && (
            <span className="pmKey">
              <span className="pmSwatch pmOnce" aria-hidden="true" />
              dashed cells came up once
            </span>
          )}
        </div>
      )}

      <div className="scroll pmScroll">
        <table
          className="rows pmMap"
          aria-label={`seconds a problem in ${opWord(op)}, rows by the ${axis.rows}, columns by the ${axis.cols}`}
          onPointerLeave={leave}
        >
          <thead>
            <tr>
              <td className="pmCorner">
                <span className="pmAcross" aria-hidden="true">
                  {axis.across} →
                </span>
                <span aria-hidden="true">{axis.down} ↓</span>
              </td>
              {map.cols.map((c) => (
                <th key={label(c)} scope="col">
                  {label(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {map.rows.map((r, i) => (
              <tr key={label(r)}>
                <th scope="row">{label(r)}</th>
                {map.cols.map((c, j) => {
                  const p = view.at[i][j];
                  if (!p) return <td key={label(c)} />;
                  const { n } = p.cell;
                  return (
                    <td key={label(c)}>
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) buttons.current.set(p.key, el);
                          else buttons.current.delete(p.key);
                        }}
                        className={`pmCell pmS${shade(p.mean, view.lo, view.hi)}${n === 1 ? " pmOnce" : ""}`}
                        tabIndex={p.key === home ? 0 : -1}
                        aria-pressed={p.key === picked}
                        aria-controls={panel}
                        aria-label={`${p.said}: ${tenths(p.mean)} seconds a problem, ${n} ${n === 1 ? "answer" : "answers"}`}
                        onPointerEnter={(e) => enter(e, p.key)}
                        onFocus={() => {
                          setPreview(p.key);
                          setCursor(p.key);
                        }}
                        onBlur={() => setPreview((k) => (k === p.key ? null : k))}
                        onClick={() => setPinned((k) => (k === p.key ? null : p.key))}
                        onKeyDown={(e) => onKey(e, p)}
                      >
                        {tenths(p.mean)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id={panel} className="pmPanel">
        {shown ? (
          <Details
            place={shown}
            pinned={shown.key === picked}
            // Only while it is picked: unpinned, it has no "show fewer" to undo it.
            open={open === shown.key && shown.key === picked}
            onToggle={() => setOpen((k) => (k === shown.key ? null : shown.key))}
          />
        ) : slow ? (
          <p className="pmSummary">
            slowest:{" "}
            <button
              type="button"
              className="link"
              aria-label={slow.said}
              onClick={() => {
                setPinned(slow.key);
                // This line is gone once the cell is picked, so focus moves to
                // the cell rather than being dropped.
                focus(slow.key);
              }}
            >
              {slow.name}
            </button>
            , at {secs(slow.mean)} s. pick a cell to see its problems.
          </p>
        ) : (
          <p className="pmSummary">no cell has come up twice yet. pick one to see its problems.</p>
        )}
      </div>
    </>
  );
}

function Details({
  place,
  pinned,
  open,
  onToggle,
}: {
  place: Place;
  /** Only a picked cell can list everything: a hover is gone before its button is reached. */
  pinned: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { cell, name, mean } = place;
  const list = [...cell.problems].sort((x, y) => each(y) - each(x) || y.n - x.n);
  const more = list.length - LIST;
  const rows = open ? list : list.slice(0, LIST);
  const repeats = list.some((p) => p.n > 1);
  const misses = cell.missed > 0;
  const wrong = misses ? `${cell.missed} wrong first` : "none wrong first";

  return (
    <>
      <p className="pmSummary">
        {cell.n === 1
          ? `${name}: came up once, ${secs(mean)} s${misses ? ", wrong first" : ""}.`
          : `${name}: ${secs(mean)} s a problem over ${cell.n} answers, ${wrong}.`}
      </p>
      <div className="scroll">
        <table className="rows pmList">
          <thead>
            <tr>
              <th scope="col">problem</th>
              <th scope="col" className="right">
                s a problem
              </th>
              {repeats && (
                <th scope="col" className="right">
                  seen
                </th>
              )}
              {misses && (
                <th scope="col" className="right">
                  wrong first
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.key}>
                <td className="mono">{solvedText(p.problem)}</td>
                <td className="right">{secs(each(p))}</td>
                {repeats && <td className="right">{p.n > 1 ? `${p.n}×` : ""}</td>}
                {misses && <td className="right">{p.missed || ""}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {more > 0 &&
        (pinned ? (
          <button type="button" className="link" aria-expanded={open} onClick={onToggle}>
            {open ? "show fewer" : `and ${more} more`}
          </button>
        ) : (
          <p className="note">and {more} more. pick the cell to list them all.</p>
        ))}
    </>
  );
}
