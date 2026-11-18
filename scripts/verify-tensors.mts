/* Checks for the /experimental tensors. Run with:
 *   node scripts/verify-tensors.mts
 * (Node >= 22.18 strips types natively.) Pure functions only: no three, no
 * React, no DOM. */

import assert from "node:assert/strict";
import { DYE_CHECK, DYE_MODEL } from "../src/app/(lab)/experimental/_tensors/core.ts";
import { ARREST_STEPS, engine, initialEngine, type EngineEvent, type EngineState, healtharTensor, healtharDefaultView } from "../src/app/(lab)/experimental/_tensors/healthar.ts";
import { RULES, walk, sidewalkTensor } from "../src/app/(lab)/experimental/_tensors/sidewalk.ts";
import { passAtK, passAtKUnbiased, rlvrSummary, rlvrTensor, PROBLEMS } from "../src/app/(lab)/experimental/_tensors/rlvr.ts";
import { estimate, FOODS, mealTensor, volumeMl } from "../src/app/(lab)/experimental/_tensors/meal.ts";
import { swagTensor, nightTensor } from "../src/app/(lab)/experimental/_tensors/extras.ts";
import { bedResolution, heightScale, BEDS, resample } from "../src/app/(lab)/experimental/_tensors/beds.ts";
import { posterOf } from "../src/app/(lab)/experimental/_tensors/poster.ts";

let checks = 0;
const check = (name: string, fn: () => void) => {
  fn();
  checks++;
  console.log(`ok  ${name}`);
};

const tiers = ["high", "mid", "low"] as const;

check("every tensor has the right shape, heights in [0,1], known dyes", () => {
  for (const tier of tiers) {
    const [cols, rows] = bedResolution("healthar", tier);
    const all = [
      healtharTensor(cols, rows),
      healtharTensor(cols, rows, { ...healtharDefaultView, noise: 1 }),
      sidewalkTensor(cols, rows),
      mealTensor(cols, rows, { food: "rice" }),
      swagTensor(cols, rows),
      nightTensor(cols, rows, [
        { minutes: 0, local: "2:41 pm", message: "Initial commit" },
        { minutes: 1239, local: "11:20 am", message: "update" },
      ]),
      resample(rlvrTensor(), cols, rows),
    ];
    for (const t of all) {
      assert.equal(t.h.length, cols * rows);
      assert.equal(t.dye.length, cols * rows);
      for (let i = 0; i < t.h.length; i++) {
        assert.ok(t.h[i] >= 0 && t.h[i] <= 1, `h out of range at ${i}: ${t.h[i]}`);
        assert.ok(t.dye[i] <= 2);
        assert.equal(typeof t.describe(i), "string");
      }
    }
  }
  const r = rlvrTensor();
  assert.equal(r.cols * r.rows, PROBLEMS.cols * PROBLEMS.rows);
});

check("tensors are deterministic", () => {
  const a = healtharTensor(64, 48, { ...healtharDefaultView, noise: 1 });
  const b = healtharTensor(64, 48, { ...healtharDefaultView, noise: 1 });
  assert.deepEqual(a.h, b.h);
  assert.deepEqual(rlvrTensor().h, rlvrTensor().h);
});

check("healthar shows 8 pose keypoints online and none offline", () => {
  const on = healtharTensor(64, 48);
  const off = healtharTensor(64, 48, { ...healtharDefaultView, offline: true });
  const yellow = (t: typeof on) => t.dye.reduce((n, d) => n + (d === DYE_MODEL ? 1 : 0), 0);
  assert.ok(yellow(on) >= 8);
  assert.equal(yellow(off), 0);
  assert.ok(off.dye.some((d) => d === DYE_CHECK), "the engine rail stays green offline");
});

check("bfs walks the shortest path and resolves the rule's faces", () => {
  const expected = [
    { nodes: 2, faces: 2 },
    { nodes: 5, faces: 4 },
    { nodes: 4, faces: 3 },
    { nodes: 4, faces: 3 },
  ];
  RULES.forEach((rule, k) => {
    const w = walk(rule);
    const manhattan = Math.abs(rule.from[0] - rule.to[0]) + Math.abs(rule.from[1] - rule.to[1]);
    assert.equal(w.path.length, manhattan + 1, `rule ${k} path is shortest`);
    assert.equal(w.path.length, expected[k].nodes);
    assert.equal(w.faces.length, expected[k].faces, `rule ${k} faces`);
    assert.equal(w.order[0], w.path[0]);
    assert.equal(w.order[w.order.length - 1], w.path[w.path.length - 1]);
    const green = (p: number) => sidewalkTensor(64, 48, { rule: k, progress: p }).dye.filter((d) => d === DYE_CHECK).length;
    assert.equal(green(0.5), 0, "nothing resolved mid-flood");
    assert.ok(green(1) > 0, "faces resolve at the end");
  });
});

check("pass@k is monotone in k and released never trails strict", () => {
  for (const s of [0, 0.001, 0.05, 0.5, 0.99]) {
    let prev = -1;
    for (let k = 1; k <= 1024; k *= 2) {
      const v = passAtK(s, k);
      assert.ok(v >= prev);
      prev = v;
    }
  }
  let prevS = -1;
  let prevR = -1;
  for (let l = 0; l <= 10; l += 0.5) {
    const sum = rlvrSummary({ log2k: l, grader: "released" });
    assert.ok(sum.strict >= prevS && sum.released >= prevR);
    assert.ok(sum.released >= sum.strict);
    prevS = sum.strict;
    prevR = sum.released;
  }
  const lo = rlvrSummary({ log2k: 0, grader: "released" });
  const hi = rlvrSummary({ log2k: 10, grader: "released" });
  assert.ok(hi.released - hi.strict > lo.released - lo.strict, "the gap grows with k");
  // Unbiased estimator: bounds and monotonicity.
  assert.equal(passAtKUnbiased(100, 0, 10), 0);
  assert.equal(passAtKUnbiased(100, 95, 10), 1);
  let p = -1;
  for (let k = 1; k <= 100; k++) {
    const v = passAtKUnbiased(100, 3, k);
    assert.ok(v >= p - 1e-12);
    p = v;
  }
});

check("the engine never lets a model lower urgency or skip a human step", () => {
  const modelEvents: EngineEvent[] = [{ type: "model.stand_down" }, { type: "model.skip_to_aed" }, { type: "model.not_breathing" }];
  for (let step = 0; step < ARREST_STEPS.length; step++) {
    for (const offline of [false, true]) {
      const s0: EngineState = { ...initialEngine(), step, offline };
      for (const e of modelEvents) {
        const s1 = engine(s0, e);
        assert.ok(ARREST_STEPS[s1.step].urgency >= ARREST_STEPS[s0.step].urgency, `${e.type} lowered urgency at step ${step}`);
        if (e.type !== "model.not_breathing" || offline) assert.equal(s1.step, s0.step, `${e.type} moved the step`);
      }
    }
  }
  // A person can bring it down (handoff to EMS is urgency 0).
  const atAed: EngineState = { ...initialEngine(), step: 5 };
  const handed = engine(atAed, { type: "human.tap" });
  assert.equal(ARREST_STEPS[handed.step].id, "handoff");
  // The fifth stand-down gets the special line.
  let s = initialEngine();
  for (let i = 0; i < 5; i++) s = engine(s, { type: "model.stand_down" });
  assert.match(s.log[s.log.length - 1], /can't talk me down/);
  // Real protocol: model.not_breathing from either intake state goes to
  // position_patient (clinical/adult_arrest.v1.json).
  for (const step of [0, 1]) {
    const next = engine({ ...initialEngine(), step }, { type: "model.not_breathing" });
    assert.equal(ARREST_STEPS[next.step].id, "position_patient");
  }
  // Counters the bed watches never go backwards, even across "start over".
  let t: EngineState = { ...initialEngine(), step: 5 };
  t = engine(t, { type: "model.stand_down" });
  const before = { rejections: t.rejections, raises: t.raises, logSeq: t.logSeq };
  t = engine(t, { type: "human.tap" }); // -> handoff
  t = engine(t, { type: "human.tap" }); // -> start over
  assert.equal(t.step, 0);
  assert.ok(t.rejections >= before.rejections && t.raises >= before.raises && t.logSeq > before.logSeq);
  assert.ok(!t.log.some((l) => /\?\./.test(l)), "no '?.' in log lines");
});

check("MAP sits between prior and likelihood, and is tighter than both", () => {
  for (const f of FOODS) {
    const e = estimate(f);
    assert.ok(volumeMl(f) > 5, `${f} has volume`);
    const lo = Math.min(e.prior.mu, e.likelihood.mu);
    const hi = Math.max(e.prior.mu, e.likelihood.mu);
    assert.ok(e.posterior.mu >= lo - 1e-9 && e.posterior.mu <= hi + 1e-9, `${f} MAP between`);
    assert.ok(e.posterior.sd < Math.min(e.prior.sd, e.likelihood.sd));
  }
});

check("posters cover every pin exactly once", () => {
  for (const bed of BEDS) {
    const [cols, rows] = bedResolution(bed, "low");
    const t = bed === "healthar" ? healtharTensor(cols, rows) : bed === "sidewalk" ? sidewalkTensor(cols, rows) : bed === "rlvr" ? rlvrTensor() : mealTensor(cols, rows);
    const p = posterOf(t, heightScale(bed, t.rows));
    const rects = p.layers.reduce((n, l) => n + (l.d.match(/M/g)?.length ?? 0), 0);
    assert.equal(rects, t.cols * t.rows);
  }
});

console.log(`\n${checks} checks passed`);
