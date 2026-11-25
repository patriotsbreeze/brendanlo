/* The drill itself: settings, and turning settings into problems. Pure, so the
 * tricks engine and scripts/verify-tricks.mts can use it without React. */

export type Op = "add" | "sub" | "mul" | "div";

export const OPS: readonly Op[] = ["add", "sub", "mul", "div"];

export const OP_SIGN: Record<Op, string> = {
  add: "+",
  sub: "−",
  mul: "×",
  div: "÷",
};

export const OP_NAME: Record<Op, string> = {
  add: "addition",
  sub: "subtraction",
  mul: "multiplication",
  div: "division",
};

/** `a <op> b = answer`. For mul, `a` is the small factor and `b` the big one;
 * for div, `b` is the small factor and `answer` the big one. */
export type Problem = { op: Op; a: number; b: number; answer: number };

export type Range = readonly [lo: number, hi: number];

export type Settings = {
  on: Record<Op, boolean>;
  /** Addends. Subtraction runs the same sums backwards. */
  add: readonly [Range, Range];
  /** Factors. Division runs the same products backwards. */
  mul: readonly [Range, Range];
  seconds: number;
};

export const DURATIONS = [30, 60, 120, 300, 600] as const;

export const STANDARD: Settings = {
  on: { add: true, sub: true, mul: true, div: true },
  add: [
    [2, 100],
    [2, 100],
  ],
  mul: [
    [2, 12],
    [2, 100],
  ],
  seconds: 120,
};

const range = (r: Range) => `${r[0]}-${r[1]}`;

/** Scores only compare within one key, so every run carries it. Ranges an
 * enabled operation does not use are left out: they cannot change the game. */
export function settingsKey(s: Settings): string {
  const ops = OPS.filter((op) => s.on[op]);
  const parts = [ops.map((op) => ({ add: "a", sub: "s", mul: "m", div: "d" })[op]).join("")];
  if (s.on.add || s.on.sub) parts.push(`a${s.add.map(range).join("+")}`);
  if (s.on.mul || s.on.div) parts.push(`m${s.mul.map(range).join("x")}`);
  parts.push(`${s.seconds}s`);
  return parts.join(".");
}

/** Exactly what settingsKey() can produce. A key is shown to everyone, so it
 * is never free text. */
export const SETTINGS_KEY =
  /^(?=[asmd])a?s?m?d?(\.a\d{1,4}-\d{1,4}\+\d{1,4}-\d{1,4})?(\.m\d{1,4}-\d{1,4}x\d{1,4}-\d{1,4})?\.\d{1,4}s$/;

export const STANDARD_KEY = settingsKey(STANDARD);

/** The key spelled for a person. Parsed back out so an old run still reads. */
export function describeKey(key: string): string {
  const [ops = "", ...rest] = key.split(".");
  // Same problems on a different clock is still recognisably standard.
  if (key.replace(/\.\d+s$/, "") === STANDARD_KEY.replace(/\.\d+s$/, "")) {
    return `standard, ${rest.at(-1)?.replace("s", " s")}`;
  }
  const signs = [...ops]
    .map((c) => ({ a: "+", s: "−", m: "×", d: "÷" })[c] ?? "")
    .join(" ");
  const seconds = rest.at(-1) ?? "";
  const ranges = rest
    .slice(0, -1)
    .map((r) => r.slice(1).replace(/-/g, "–").replace("x", " × ").replace("+", " + "));
  return [signs, ...ranges, seconds.replace("s", " s")].filter(Boolean).join(", ");
}

/** Why these settings cannot start, or null when they can. */
export function settingsError(s: Settings): string | null {
  if (!OPS.some((op) => s.on[op])) return "turn on at least one operation.";
  const ranges: [string, Range][] = [];
  if (s.on.add || s.on.sub) ranges.push(["addition", s.add[0]], ["addition", s.add[1]]);
  if (s.on.mul || s.on.div) ranges.push(["multiplication", s.mul[0]], ["multiplication", s.mul[1]]);
  for (const [name, [lo, hi]] of ranges) {
    if (!Number.isInteger(lo) || !Number.isInteger(hi)) return `fill in every ${name} range.`;
    if (lo < 0 || hi > 9999) return `keep the ${name} ranges between 0 and 9999.`;
    if (lo > hi) return `one ${name} range runs backwards (${lo} to ${hi}).`;
  }
  // A divisor of 0 has no answer, so division needs somewhere else to go.
  if (s.on.div && s.mul[0][1] === 0) return "division needs a first factor above 0.";
  return null;
}

const isRange = (v: unknown): v is Range =>
  Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n));

/** Settings remembered by the browser, or null if they are not usable. */
export function parseSettings(v: unknown): Settings | null {
  if (typeof v !== "object" || v === null) return null;
  const s = v as Partial<Settings>;
  if (!s.on || OPS.some((op) => typeof s.on?.[op] !== "boolean")) return null;
  if (!Array.isArray(s.add) || !s.add.every(isRange) || s.add.length !== 2) return null;
  if (!Array.isArray(s.mul) || !s.mul.every(isRange) || s.mul.length !== 2) return null;
  if (!DURATIONS.some((d) => d === s.seconds)) return null;
  const { on, add, mul, seconds } = s as Settings;
  const clean: Settings = {
    on: { add: on.add, sub: on.sub, mul: on.mul, div: on.div },
    add,
    mul,
    seconds,
  };
  return settingsError(clean) ? null : clean;
}

type Rng = () => number;

const pick = (r: Range, rng: Rng) => r[0] + Math.floor(rng() * (r[1] - r[0] + 1));

export function makeOp(op: Op, s: Settings, rng: Rng = Math.random): Problem {
  if (op === "add" || op === "sub") {
    const x = pick(s.add[0], rng);
    const y = pick(s.add[1], rng);
    return op === "add"
      ? { op, a: x, b: y, answer: x + y }
      : { op, a: x + y, b: x, answer: y };
  }
  const small = pick(op === "div" ? [Math.max(1, s.mul[0][0]), s.mul[0][1]] : s.mul[0], rng);
  const big = pick(s.mul[1], rng);
  return op === "mul"
    ? { op, a: small, b: big, answer: small * big }
    : { op, a: small * big, b: small, answer: big };
}

const same = (p: Problem, q: Problem) => p.op === q.op && p.a === q.a && p.b === q.b;

/** Each enabled operation is equally likely. Skips an immediate repeat, which
 * would accept the digits already in the player's fingers. */
export function makeProblem(s: Settings, last?: Problem, rng: Rng = Math.random): Problem {
  const ops = OPS.filter((op) => s.on[op]);
  let p = makeOp(ops[Math.floor(rng() * ops.length)], s, rng);
  for (let i = 0; i < 8 && last && same(p, last); i++) {
    p = makeOp(ops[Math.floor(rng() * ops.length)], s, rng);
  }
  return p;
}

/** Every problem the standard settings can ask for one operation. */
export function allProblems(op: Op): Problem[] {
  const [[lo1, hi1], [lo2, hi2]] = op === "add" || op === "sub" ? STANDARD.add : STANDARD.mul;
  const out: Problem[] = [];
  for (let x = lo1; x <= hi1; x++) {
    for (let y = lo2; y <= hi2; y++) {
      if (op === "add") out.push({ op, a: x, b: y, answer: x + y });
      if (op === "sub") out.push({ op, a: x + y, b: x, answer: y });
      if (op === "mul") out.push({ op, a: x, b: y, answer: x * y });
      if (op === "div") out.push({ op, a: x * y, b: x, answer: y });
    }
  }
  return out;
}

export const show = (p: Problem) => `${p.a} ${OP_SIGN[p.op]} ${p.b}`;
