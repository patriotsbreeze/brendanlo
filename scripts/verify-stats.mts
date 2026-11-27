/* Checks what the stats tab is built on: that every problem sorts into kinds the
 * way kinds.ts promises.
 *
 *   node scripts/verify-stats.mts
 */

import assert from "node:assert/strict";
import { GROUPS, kindsOf } from "../src/app/(zetamath)/zetamath/_lib/kinds.ts";
import {
  allProblems,
  makeOp,
  OPS,
  show,
  type Problem,
  type Settings,
} from "../src/app/(zetamath)/zetamath/_lib/problems.ts";

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

console.log(`${count} stats checks passed.`);
