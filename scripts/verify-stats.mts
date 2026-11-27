/* Checks what the stats tab is built on: that every problem sorts into kinds the
 * way kinds.ts promises, and that the periods, sums, weak spots, maps and trend
 * lines in stats.ts all come out of the same answers.
 *
 *   node scripts/verify-stats.mts
 */

import assert from "node:assert/strict";
import { GROUPS, kindsOf } from "../src/app/(zetamath)/zetamath/_lib/kinds.ts";
import {
  allProblems,
  makeOp,
  makeProblem,
  OPS,
  show,
  STANDARD,
  STANDARD_KEY,
  type Problem,
  type Settings,
} from "../src/app/(zetamath)/zetamath/_lib/problems.ts";
import {
  answersOf,
  opTotals,
  type Answer,
  type Run,
  type Solved,
} from "../src/app/(zetamath)/zetamath/_lib/runs.ts";
import {
  buckets,
  daysOf,
  grid,
  meanMs,
  missRate,
  opTally,
  periodOf,
  shift,
  stepTo,
  tally,
  trend,
  weakSpots,
  within,
  type Tally,
} from "../src/app/(zetamath)/zetamath/_lib/stats.ts";

let count = 0;
function test(name: string, body: () => void) {
  try {
    body();
    count++;
  } catch (e) {
    console.error(`FAILED: ${name}`);
    throw e;
  }
}

/** Every standard problem, and a spread from the widest settings allowed. */
function problems(): Problem[] {
  const wide: Settings = {
    on: { add: true, sub: true, mul: true, div: true },
    add: [
      [0, 9999],
      [0, 9999],
    ],
    mul: [
      [1, 9999],
      [0, 9999],
    ],
    seconds: 120,
  };
  let seed = 1;
  const rng = () => ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
  return [
    ...OPS.flatMap(allProblems),
    ...OPS.flatMap((op) => Array.from({ length: 5000 }, () => makeOp(op, wide, rng))),
  ];
}

test("every problem is one kind of each whole group, and only its own operation's", () => {
  for (const p of problems()) {
    const kinds = kindsOf(p);
    for (const group of GROUPS[p.op]) {
      const mine = kinds.filter((k) => k.group === group);
      if (group.every) assert.equal(mine.length, 1, `${show(p)}: ${group.name}`);
      assert.equal(new Set(mine).size, mine.length, `${show(p)}: ${group.name} twice`);
    }
    assert.ok(kinds.every((k) => k.op === p.op && k.id.startsWith(`${p.op}.`)), show(p));
  }
});

test("a kind is the same object, label and place every time", () => {
  const seen = new Map<string, ReturnType<typeof kindsOf>[number]>();
  for (const p of problems()) {
    for (const k of kindsOf(p)) {
      const first = seen.get(k.id);
      if (first) assert.equal(k, first, k.id);
      else seen.set(k.id, k);
      assert.match(k.id, /^[a-z]+\.[a-z]+\.[a-z0-9]+$/);
      assert.ok(k.label.trim().length > 0 && !/undefined|NaN/.test(k.label), k.id);
    }
  }
  // No two kinds of one group share a label or a place.
  for (const op of OPS) {
    for (const group of GROUPS[op]) {
      const kinds = [...seen.values()].filter((k) => k.group === group);
      assert.equal(new Set(kinds.map((k) => k.label)).size, kinds.length, `${op} ${group.name} labels`);
      assert.equal(new Set(kinds.map((k) => k.order)).size, kinds.length, `${op} ${group.name} order`);
    }
  }
});

test("the kinds say true things", () => {
  const is = (p: Problem, id: string) => kindsOf(p).some((k) => k.id === id);
  const at = (op: Problem["op"], a: number, b: number): Problem => ({
    op,
    a,
    b,
    answer: { add: a + b, sub: a - b, mul: a * b, div: a / b }[op],
  });
  assert.ok(is(at("add", 67, 58), "add.carry.yes"));
  assert.ok(is(at("add", 61, 38), "add.carry.no"));
  assert.ok(is(at("add", 67, 58), "add.answer.3"));
  assert.ok(is(at("add", 7, 58), "add.size.12"));
  assert.ok(is(at("add", 58, 7), "add.size.12"), "either way round");
  assert.ok(is(at("add", 48, 46), "add.shape.near"));
  assert.ok(!is(at("add", 48, 48), "add.shape.near") && is(at("add", 48, 48), "add.shape.double"));
  assert.ok(is(at("sub", 143, 87), "sub.borrow.yes"));
  assert.ok(is(at("sub", 143, 87), "sub.shape.through"));
  assert.ok(is(at("sub", 143, 87), "sub.size.32"));
  assert.ok(!is(at("sub", 143, 21), "sub.shape.through"), "122 stays above 100");
  assert.ok(is(at("mul", 7, 58), "mul.first.7"));
  assert.ok(is(at("mul", 7, 58), "mul.second.2"));
  assert.ok(is(at("mul", 7, 14), "mul.second.teens"));
  assert.ok(is(at("mul", 7, 8), "mul.shape.table") && is(at("mul", 7, 8), "mul.second.1"));
  assert.ok(is(at("mul", 25, 40), "mul.first.d2"), "past 20, by size");
  assert.ok(is(at("div", 84, 12), "div.by.12"));
  assert.ok(is(at("div", 84, 12), "div.shape.table"));
  assert.ok(is(at("div", 696, 12), "div.answer.2"));
  assert.ok(is(at("div", 600, 12), "div.shape.ten"));
});

// -------------------------------------------------------------- the numbers

test("periods are calendar days, Monday weeks and calendar months", () => {
  assert.deepEqual(periodOf("day", "2026-11-26"), { span: "day", from: "2026-11-26", to: "2026-11-26" });
  for (const day of ["2026-11-23", "2026-11-26", "2026-11-29"]) {
    assert.deepEqual(periodOf("week", day), { span: "week", from: "2026-11-23", to: "2026-11-29" }, day);
  }
  assert.equal(periodOf("week", "2026-11-30").from, "2026-11-30");
  assert.deepEqual(periodOf("week", "2027-01-01"), { span: "week", from: "2026-12-28", to: "2027-01-03" });
  assert.deepEqual(periodOf("month", "2028-02-14"), { span: "month", from: "2028-02-01", to: "2028-02-29" });
  assert.deepEqual(periodOf("month", "2026-11-30"), { span: "month", from: "2026-11-01", to: "2026-11-30" });
  assert.deepEqual(shift(periodOf("month", "2026-12-31"), 1), periodOf("month", "2027-01-01"));
  assert.deepEqual(shift(periodOf("month", "2026-03-31"), -1), periodOf("month", "2026-02-01"));
  assert.deepEqual(shift(periodOf("week", "2026-11-26"), -1), periodOf("week", "2026-11-19"));
  // Days are dates, so a clock change in March does not move them.
  assert.deepEqual(shift(periodOf("day", "2026-03-08"), 1), periodOf("day", "2026-03-09"));
  assert.equal(shift(periodOf("all", "2026-11-26"), 1), null);
  assert.equal(daysOf(periodOf("week", "2026-11-26")).length, 7);
  assert.equal(daysOf(periodOf("month", "2028-02-01")).at(-1), "2028-02-29");
  assert.ok(within("2026-11-29", periodOf("week", "2026-11-26")));
  assert.ok(!within("2026-11-30", periodOf("week", "2026-11-26")));
  assert.ok(within("2019-12-31", periodOf("all", "2026-11-26")));

  const played = ["2026-09-03", "2026-11-02", "2026-11-26"];
  assert.deepEqual(stepTo(periodOf("day", "2026-11-26"), -1, played), periodOf("day", "2026-11-02"));
  assert.deepEqual(stepTo(periodOf("week", "2026-11-26"), -1, played), periodOf("week", "2026-11-02"));
  assert.deepEqual(stepTo(periodOf("month", "2026-11-26"), -1, played), periodOf("month", "2026-09-03"));
  assert.equal(stepTo(periodOf("day", "2026-11-26"), 1, played), null);
  assert.equal(stepTo(periodOf("day", "2026-09-03"), -1, played), null);
  assert.deepEqual(stepTo(periodOf("day", "2026-10-01"), 1, played), periodOf("day", "2026-11-02"));
});

test("buckets are round, few, and hold every value once", () => {
  assert.deepEqual(buckets(2, 12).length, 11);
  const tens = buckets(2, 100);
  assert.deepEqual(tens[0], { from: 2, to: 9 });
  assert.deepEqual(tens[1], { from: 10, to: 19 });
  assert.deepEqual(tens.at(-1), { from: 100, to: 100 });
  assert.equal(tens.length, 11);
  assert.deepEqual(buckets(7, 7), [{ from: 7, to: 7 }]);
  for (const [lo, hi] of [[0, 9999], [2, 200], [4, 1200], [13, 27], [0, 13], [950, 1049], [1, 99_999]]) {
    const bs = buckets(lo, hi);
    assert.ok(bs.length <= 12, `${lo}-${hi}: ${bs.length}`);
    assert.equal(bs[0].from, lo);
    assert.equal(bs.at(-1)?.to, hi);
    for (let i = 1; i < bs.length; i++) assert.equal(bs[i].from, bs[i - 1].to + 1, `${lo}-${hi}`);
  }
});

/** Runs played the way Play.tsx records them, with answers kept or not. */
function play(n: number, rng: () => number, slow: (p: Problem) => number = () => 1) {
  const out: Run[] = [];
  for (let i = 0; i < n; i++) {
    const solved: Solved[] = [];
    let at = 0;
    let last: Problem | undefined;
    while (solved.length < 30) {
      const problem = makeProblem(STANDARD, last, rng);
      const ms = (800 + rng() * 3000) * slow(problem) + 0.4;
      at += ms;
      solved.push({ problem, ms, at, misses: rng() < 0.15 ? 1 + Math.floor(rng() * 3) : 0 });
      last = problem;
    }
    const when = Date.UTC(2026, 10, 1 + (i % 26), 15, i);
    out.push({
      id: `run-${i}`,
      at: when,
      day: new Date(when).toISOString().slice(0, 10),
      score: solved.length,
      seconds: 120,
      settings: STANDARD_KEY,
      ops: opTotals(solved),
      ...(i % 5 === 4 ? {} : { answers: answersOf(solved) }),
      excluded: false,
    });
  }
  return out;
}

const sum = (ts: readonly Tally[]) =>
  ts.reduce((s, t) => ({ n: s.n + t.n, ms: s.ms + t.ms, missed: s.missed + t.missed, checked: s.checked + t.checked }), {
    n: 0,
    ms: 0,
    missed: 0,
    checked: 0,
  });
const bare = ({ n, ms, missed, checked }: Tally) => ({ n, ms, missed, checked });

test("everything adds up to the same answers", () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
  const runs = play(60, rng);
  const s = tally(runs);
  assert.equal(s.runs, 60);
  assert.equal(s.detailed, 48);
  assert.equal(s.days, 26);
  assert.equal(s.total.n, runs.reduce((n, r) => n + r.score, 0));
  const kept = runs.filter((r) => r.answers);
  for (const op of OPS) {
    const fromRuns = runs.reduce((t, r) => [t[0] + (r.ops[op]?.[0] ?? 0), t[1] + (r.ops[op]?.[1] ?? 0)], [0, 0]);
    assert.deepEqual([s.ops[op]?.n, s.ops[op]?.ms], fromRuns, op);
    // The answers, rounded as the totals are, add up to them exactly.
    const keptTotals = kept.reduce((t, r) => [t[0] + (r.ops[op]?.[0] ?? 0), t[1] + (r.ops[op]?.[1] ?? 0)], [0, 0]);
    assert.deepEqual([s.answered[op]?.n, s.answered[op]?.ms], keptTotals, `${op} answered`);
    assert.equal(s.ops[op]?.checked, s.answered[op]?.n, `${op}: misses only from kept answers`);
    const answered = bare(s.answered[op] as Tally);
    assert.deepEqual(bare(sum(s.problems.filter((p) => p.problem.op === op))), answered, `${op} problems`);
    for (const group of GROUPS[op]) {
      if (!group.every) continue;
      assert.deepEqual(bare(sum(s.kinds.filter((k) => k.kind.group === group))), answered, `${op} ${group.name}`);
    }
    const g = grid(s, op);
    assert.ok(g);
    assert.deepEqual(bare(sum(g.cells.flat().filter((c) => c !== null))), answered, `${op} map`);
    assert.equal(g.cells.flat().reduce((n, c) => n + (c?.problems.length ?? 0), 0), s.problems.filter((p) => p.problem.op === op).length);
    assert.ok(g.rows.length <= 12 && g.cols.length <= 12);
  }
  for (const p of s.problems) {
    assert.ok(p.best <= p.ms / p.n && p.ms / p.n <= p.worst, p.key);
    assert.ok(p.missed <= p.checked && p.checked === p.n, p.key);
  }
  assert.equal(meanMs({ n: 0, ms: 0, missed: 0, checked: 0 }), null);
  assert.equal(missRate({ n: 3, ms: 9, missed: 0, checked: 0 }), null);
  assert.deepEqual(tally([]).kinds, []);
});

test("a slow kind is found, and a single slow answer is not", () => {
  let seed = 11;
  const rng = () => ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
  const sevens = tally(play(40, rng, (p) => (p.op === "mul" && p.a === 7 ? 2.5 : 1)));
  const [top] = weakSpots(sevens);
  assert.equal(top.kind.kind.id, "mul.first.7");
  assert.ok(top.ratio > 1.5 && top.cost > 0 && top.mean > top.base);
  assert.equal(top.kind.trick, "mul-7", "and the trick for it");
  const table = sevens.kinds.find((k) => k.kind.id === "mul.shape.table");
  assert.ok(table && table.trick === undefined, "many tables, so no one trick");
  for (const spot of weakSpots(sevens)) assert.ok(spot.ratio >= 1.08 && spot.kind.n >= 4);
  for (let i = 1; i < weakSpots(sevens).length; i++) {
    assert.ok(weakSpots(sevens)[i - 1].ratio >= weakSpots(sevens)[i].ratio);
  }

  const runs = play(1, rng);
  const answers = runs[0].answers as Answer[];
  const lone = answers.findIndex(([op]) => OPS[op] === "mul");
  answers[lone] = [answers[lone][0], 19, answers[lone][2], 60_000, 0];
  assert.ok(!weakSpots(tally(runs)).some((s) => s.kind.kind.id === "mul.first.19"), "one answer is not a pattern");
});

test("trend lines have a point per run, day, week or month", () => {
  let seed = 3;
  const rng = () => ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
  const runs = play(30, rng);
  const nov = periodOf("month", "2026-11-26");
  assert.equal(trend(runs, nov).length, 30);
  assert.equal(trend(runs, nov).reduce((n, p) => n + p.runs.length, 0), 30);
  assert.equal(trend(runs, periodOf("week", "2026-11-26")).length, 7);
  const day = runs.filter((r) => r.day === "2026-11-02");
  assert.equal(trend(day, periodOf("day", "2026-11-02")).length, day.length);
  assert.equal(trend(runs, periodOf("all", "2026-11-26")).length, 26, "a month of days, by day");
  const spread = runs.map((r, i) => ({ ...r, day: new Date(Date.UTC(2025, 0, 1 + i * 20)).toISOString().slice(0, 10) }));
  const weeks = trend(spread, periodOf("all", "2026-11-26"));
  assert.ok(weeks.length > 12 && weeks.length <= 90, `by week or month: ${weeks.length}`);
  assert.equal(weeks.reduce((n, p) => n + p.runs.length, 0), 30);
  assert.deepEqual(trend([], periodOf("all", "2026-11-26")), []);
  assert.deepEqual(bare(sum(Object.values(opTally(runs)))), { ...bare(tally(runs).total), missed: 0, checked: 0 });
});

console.log(`${count} stats checks passed.`);
