/* Checks every trick on /zetamath/tricks against every problem the standard
 * settings can produce: the result, and each line of arithmetic it prints.
 *
 *   node scripts/verify-tricks.mts
 */

import { allProblems, makeProblem, OPS, settingsKey, show, STANDARD, describeKey, STANDARD_KEY } from "../src/app/(zetamath)/zetamath/_lib/problems.ts";
import { coverage, exampleProblem, TRICKS, trickFor } from "../src/app/(zetamath)/zetamath/_lib/tricks.ts";

let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 20) console.error("FAIL", msg);
};

/** Left to right with × ÷ before + −, which is all the steps ever use. */
function evaluate(expr: string): number {
  const js = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  if (!/^[\d\s+*/.-]+$/.test(js)) return NaN;
  return Function(`"use strict"; return (${js});`)() as number;
}

const EQUATION = /(\d+(?: [+×÷−] \d+)+) = (\d+)/g;

let lines = 0;
let checked = 0;
for (const t of TRICKS) {
  const fitting = allProblems(t.op).filter(t.fits);
  if (fitting.length === 0) fail(`${t.id}: fits nothing`);
  for (const p of fitting) {
    checked++;
    const { steps, result } = t.work(p);
    if (result !== p.answer) fail(`${t.id}: ${show(p)} worked out to ${result}, not ${p.answer}`);
    for (const step of steps) {
      if (/NaN|undefined|Infinity|\d\.\d/.test(step)) fail(`${t.id}: ${show(p)}: bad line "${step}"`);
      for (const [, lhs, rhs] of step.matchAll(EQUATION)) {
        lines++;
        if (evaluate(lhs) !== Number(rhs)) fail(`${t.id}: ${show(p)}: "${step}"`);
      }
    }
    // What the trick tells you to type, in order, has to spell the answer.
    const typed = /^type (.+)$/.exec(steps.at(-1) ?? "");
    if (typed && typed[1].replace(/\D/g, "") !== String(p.answer)) {
      fail(`${t.id}: ${show(p)}: "${steps.at(-1)}" does not spell ${p.answer}`);
    }
  }
  const ex = exampleProblem(t);
  if (!t.fits(ex)) fail(`${t.id}: its own example ${show(ex)} does not fit`);
  if (t.op === "div" && !Number.isInteger(ex.answer)) fail(`${t.id}: example does not divide`);
}

if (new Set(TRICKS.map((t) => t.id)).size !== TRICKS.length) fail("duplicate trick id");

console.log(`${TRICKS.length} tricks, ${checked} worked problems, ${lines} printed equations`);
for (const op of OPS) {
  const all = allProblems(op);
  const hit = all.filter((p) => trickFor(p)).length;
  console.log(`  ${op}: a trick for ${((100 * hit) / all.length).toFixed(1)}% of ${all.length}`);
  for (const t of TRICKS.filter((x) => x.op === op)) {
    console.log(`     ${(100 * coverage(t)).toFixed(1).padStart(5)}%  ${t.id}`);
  }
}

// The generator stays in range, and never repeats a problem back to back.
let last = makeProblem(STANDARD);
for (let i = 0; i < 200_000; i++) {
  const p = makeProblem(STANDARD, last);
  if (p.op === last.op && p.a === last.a && p.b === last.b) fail(`repeat: ${show(p)}`);
  const ok = {
    add: p.a >= 2 && p.a <= 100 && p.b >= 2 && p.b <= 100 && p.answer === p.a + p.b,
    sub: p.answer >= 2 && p.answer <= 100 && p.b >= 2 && p.b <= 100 && p.answer === p.a - p.b,
    mul: p.a >= 2 && p.a <= 12 && p.b >= 2 && p.b <= 100 && p.answer === p.a * p.b,
    div: p.b >= 2 && p.b <= 12 && p.answer >= 2 && p.answer <= 100 && p.answer === p.a / p.b,
  }[p.op];
  if (!ok) fail(`out of range: ${show(p)} = ${p.answer}`);
  last = p;
}

const over100 = allProblems("sub").filter((p) => p.a > 100).length / allProblems("sub").length;
console.log(`subtractions starting above 100: ${(100 * over100).toFixed(1)}%`);
console.log(`standard key: ${STANDARD_KEY} -> "${describeKey(STANDARD_KEY)}"`);
const custom = settingsKey({ ...STANDARD, on: { ...STANDARD.on, add: false }, seconds: 60 });
console.log(`custom key: ${custom} -> "${describeKey(custom)}"`);

if (failures) {
  console.error(`${failures} failures`);
  process.exit(1);
}
console.log("all good");
