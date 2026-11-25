/* Every trick on /zetamath/tricks, as code. `fits` says which problems it is
 * for and `work` does the problem the trick's way, so the page's examples,
 * drills, coverage figures and the "try this" hints all come from one place.
 *
 * scripts/verify-tricks.mts runs each `work` on every standard problem it fits
 * and checks the result, plus every "x = y" line it prints. Keep lines either
 * pure arithmetic or prose, with an optional "label: " in front. */

import { allProblems, type Op, type Problem } from "./problems.ts";

export type Work = { steps: string[]; result: number };

export type Trick = {
  id: string;
  op: Op;
  title: string;
  /** What to do, and why it is faster. */
  idea: string;
  /** Shown first, before anyone presses "another". */
  example: [a: number, b: number];
  fits: (p: Problem) => boolean;
  work: (p: Problem) => Work;
};

const tens = (n: number) => Math.floor(n / 10) * 10;
const ones = (n: number) => n % 10;
const twoDigit = (n: number) => n >= 10 && n <= 99;

/** Rounding tricks earn their extra step only when there is a carry or a borrow
 * to dodge. Without one, plain left to right is quicker. */
const carries = (p: Problem) => ones(p.a) + ones(p.b) >= 10;
const borrows = (p: Problem) => ones(p.a) < ones(p.b);

export const TRICKS: readonly Trick[] = [
  // ------------------------------------------------------------- addition
  {
    id: "add-left-to-right",
    op: "add",
    title: "add from the left",
    idea: "keep the first number whole. add the other one's tens, then its ones. you only ever hold one running total.",
    example: [67, 58],
    fits: (p) => twoDigit(p.a) && twoDigit(p.b) && ones(p.b) !== 0,
    work: ({ a, b }) => {
      const mid = a + tens(b);
      return {
        steps: [`${a} + ${tens(b)} = ${mid}`, `${mid} + ${ones(b)} = ${a + b}`],
        result: mid + ones(b),
      };
    },
  },
  {
    id: "add-peek",
    op: "add",
    title: "peek at the ones, then write",
    idea: "glance at the ones first, only to see whether they reach 10. now you know the tens digit for certain, so you can type it while you are still working out the last digit.",
    example: [46, 37],
    fits: (p) => twoDigit(p.a) && twoDigit(p.b),
    work: ({ a, b }) => {
      const o = ones(a) + ones(b);
      const carry = o >= 10 ? 1 : 0;
      const t = tens(a) / 10 + tens(b) / 10;
      return {
        steps: [
          `ones: ${ones(a)} + ${ones(b)} = ${o}`,
          carry
            ? `10 or more, so one carries: ${t} + 1 = ${t + 1}`
            : `under 10, nothing carries: ${tens(a) / 10} + ${tens(b) / 10} = ${t}`,
          `type ${t + carry}, then ${o % 10}`,
        ],
        result: (t + carry) * 10 + (o % 10),
      };
    },
  },
  {
    id: "add-round-up",
    op: "add",
    title: "round up the 7, 8 or 9",
    idea: "when a number ends in 7, 8 or 9, add the next ten instead and take back the difference. no carrying.",
    example: [46, 39],
    fits: (p) => carries(p) && [p.a, p.b].some((n) => n >= 17 && n < 100 && ones(n) >= 7),
    work: ({ a, b }) => {
      const score = (n: number) => (n >= 17 && n < 100 ? ones(n) : 0);
      const [x, y] = score(b) >= score(a) ? [a, b] : [b, a];
      const up = tens(y) + 10;
      return {
        steps: [`${x} + ${up} = ${x + up}`, `${x + up} − ${up - y} = ${x + y}`],
        result: x + up - (up - y),
      };
    },
  },
  {
    id: "add-make-100",
    op: "add",
    title: "fill the big one up to 100",
    idea: "if one number is close to 100, see what it is missing, take that out of the other number, and whatever is left sits on top of 100.",
    example: [88, 67],
    fits: (p) =>
      carries(p) && Math.max(p.a, p.b) >= 80 && Math.max(p.a, p.b) < 100 && p.a + p.b > 100,
    work: ({ a, b }) => {
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      const gap = 100 - hi;
      return {
        steps: [
          `100 − ${hi} = ${gap}`,
          `${lo} − ${gap} = ${lo - gap}`,
          `100 + ${lo - gap} = ${a + b}`,
        ],
        result: 100 + (lo - gap),
      };
    },
  },
  {
    id: "add-near-double",
    op: "add",
    title: "almost the same number? double it",
    idea: "when the two numbers are within 3 of each other, double the smaller and add the gap. doubles are the sums you already know cold.",
    example: [48, 46],
    fits: (p) => p.a >= 11 && p.b >= 11 && p.a !== p.b && Math.abs(p.a - p.b) <= 3,
    work: ({ a, b }) => {
      const lo = Math.min(a, b);
      const gap = Math.abs(a - b);
      return {
        steps: [`${lo} × 2 = ${lo * 2}`, `${lo * 2} + ${gap} = ${a + b}`],
        result: lo * 2 + gap,
      };
    },
  },

  // ---------------------------------------------------------- subtraction
  {
    id: "sub-through-100",
    op: "sub",
    title: "go through 100",
    idea: "when the first number is over 100 and the ones would borrow, don't subtract. measure the two pieces either side of 100 and add them. no borrowing, ever.",
    example: [143, 87],
    fits: (p) => borrows(p) && p.a > 100 && p.b > 10 && p.b < 100,
    work: ({ a, b }) => {
      const below = 100 - b;
      const above = a - 100;
      return {
        steps: [
          `${b} up to 100: 100 − ${b} = ${below}`,
          `100 up to ${a}: ${a} − 100 = ${above}`,
          `${below} + ${above} = ${below + above}`,
        ],
        result: below + above,
      };
    },
  },
  {
    id: "sub-from-100",
    op: "sub",
    title: "nines, then a ten",
    idea: "to take a number from 100, subtract each digit from 9, except the last one, which you subtract from 10. this is the first half of going through 100, so make it automatic.",
    example: [100, 37],
    fits: (p) => p.a === 100 && twoDigit(p.b) && ones(p.b) !== 0,
    work: ({ b }) => {
      const t = 9 - tens(b) / 10;
      const o = 10 - ones(b);
      return {
        steps: [`tens: 9 − ${tens(b) / 10} = ${t}`, `ones: 10 − ${ones(b)} = ${o}`, `type ${t * 10 + o}`],
        result: t * 10 + o,
      };
    },
  },
  {
    id: "sub-round-up",
    op: "sub",
    title: "slide both numbers up",
    idea: "adding the same amount to both numbers doesn't change the gap. so if the ones would borrow and you are subtracting something that ends in 7, 8 or 9, push both up until it ends in 0.",
    example: [92, 38],
    fits: (p) => borrows(p) && p.b >= 17 && p.b < 100 && ones(p.b) >= 7,
    work: ({ a, b }) => {
      const k = 10 - ones(b);
      return {
        steps: [`${a} + ${k} = ${a + k}`, `${b} + ${k} = ${b + k}`, `${a + k} − ${b + k} = ${a - b}`],
        result: a + k - (b + k),
      };
    },
  },
  {
    id: "sub-count-up",
    op: "sub",
    title: "count up instead of borrowing",
    idea: "if the ones would force a borrow, climb from the small number: first to the next ten, then the rest of the way.",
    example: [83, 47],
    fits: (p) => borrows(p) && p.a <= 100 && p.b > 10,
    work: ({ a, b }) => {
      const next = tens(b) + 10;
      return {
        steps: [`${next} − ${b} = ${next - b}`, `${a} − ${next} = ${a - next}`, `${next - b} + ${a - next} = ${a - b}`],
        result: next - b + (a - next),
      };
    },
  },
  {
    id: "sub-peek",
    op: "sub",
    title: "peek for the borrow, then write",
    idea: "compare the ones first. if the top one is smaller, the tens come out one lower and the ones borrow a 10. that settles the tens digit before you have to finish.",
    example: [134, 58],
    fits: (p) => p.b > 10 && p.b < 100,
    work: ({ a, b }) => {
      const borrow = ones(a) < ones(b);
      const ta = tens(a) / 10;
      const tb = tens(b) / 10;
      const t = ta - tb - (borrow ? 1 : 0);
      const o = ones(a) + (borrow ? 10 : 0) - ones(b);
      return {
        steps: [
          borrow
            ? `${ones(a)} is less than ${ones(b)}, so one is borrowed: ${ta} − ${tb} − 1 = ${t}`
            : `no borrow: ${ta} − ${tb} = ${t}`,
          borrow ? `ones: 1${ones(a)} − ${ones(b)} = ${o}` : `ones: ${ones(a)} − ${ones(b)} = ${o}`,
          `type ${t * 10 + o}`,
        ],
        result: t * 10 + o,
      };
    },
  },

  // ------------------------------------------------------- multiplication
  {
    id: "mul-11",
    op: "mul",
    title: "× 11: split the digits, sum in the middle",
    idea: "pull the two digits apart and put their sum between them. if the sum is 10 or more, its 1 joins the first digit.",
    example: [11, 47],
    fits: (p) => p.a === 11 && twoDigit(p.b),
    work: ({ b }) => {
      const t = tens(b) / 10;
      const o = ones(b);
      const s = t + o;
      const head = s >= 10 ? t + 1 : t;
      return {
        steps: [
          `${t} _ ${o}`,
          `middle: ${t} + ${o} = ${s}`,
          ...(s >= 10 ? [`keep ${s % 10}, carry the 1: ${t} + 1 = ${head}`] : []),
          `type ${head}, ${s % 10}, ${o}`,
        ],
        result: head * 100 + (s % 10) * 10 + o,
      };
    },
  },
  {
    id: "mul-12",
    op: "mul",
    title: "× 12: ten of it, plus double",
    idea: "say the number with a zero on the end, then add its double. both halves are things you can read straight off.",
    example: [12, 47],
    fits: (p) => p.a === 12 && p.b >= 11 && ones(p.b) !== 0,
    work: ({ b }) => ({
      steps: [`${b} × 10 = ${b * 10}`, `${b} × 2 = ${b * 2}`, `${b * 10} + ${b * 2} = ${b * 12}`],
      result: b * 10 + b * 2,
    }),
  },
  {
    id: "mul-9",
    op: "mul",
    title: "× 9: go down, then finish the ten",
    idea: "subtract one more than the tens digit: that is the front of the answer. the last digit is 10 minus the ones digit (a 0 stays 0: just do the tens). it is ×10 minus the number, with the subtraction already done.",
    example: [9, 47],
    fits: (p) => p.a === 9 && twoDigit(p.b) && ones(p.b) !== 0,
    work: ({ b }) => {
      const t = tens(b) / 10;
      const front = b - (t + 1);
      const last = 10 - ones(b);
      return {
        steps: [`front: ${b} − ${t + 1} = ${front}`, `last: 10 − ${ones(b)} = ${last}`, `type ${front}, then ${last}`],
        result: front * 10 + last,
      };
    },
  },
  {
    id: "mul-5",
    op: "mul",
    title: "× 5: halve it, then a 0 or a 5",
    idea: "five is half of ten. even number: halve and add a 0. odd number: halve the even number just below it and add a 5.",
    example: [5, 47],
    fits: (p) => p.a === 5 && p.b >= 11 && p.b < 100,
    work: ({ b }) => {
      const even = b - (b % 2);
      const half = even / 2;
      const tail = b % 2 ? 5 : 0;
      return {
        steps: [`${even} ÷ 2 = ${half}`, `${b % 2 ? "odd" : "even"}, so it ends in ${tail}`, `type ${half}, then ${tail}`],
        result: half * 10 + tail,
      };
    },
  },
  {
    id: "mul-4",
    op: "mul",
    title: "× 4: double, double",
    idea: "doubling from the left is nearly free. twice gives you four times.",
    example: [4, 67],
    fits: (p) => p.a === 4 && p.b >= 11 && p.b < 100,
    work: ({ b }) => ({
      steps: [`${b} × 2 = ${b * 2}`, `${b * 2} × 2 = ${b * 4}`],
      result: b * 2 * 2,
    }),
  },
  {
    id: "mul-8",
    op: "mul",
    title: "× 8: ten of it, minus double",
    idea: "the mirror image of × 12. (doubling three times works too, and is nicer when the number is small.)",
    example: [8, 47],
    fits: (p) => p.a === 8 && p.b >= 11 && ones(p.b) !== 0,
    work: ({ b }) => ({
      steps: [`${b} × 10 = ${b * 10}`, `${b} × 2 = ${b * 2}`, `${b * 10} − ${b * 2} = ${b * 8}`],
      result: b * 10 - b * 2,
    }),
  },
  {
    id: "mul-6",
    op: "mul",
    title: "× 6: triple, then double",
    idea: "two easy moves instead of one hard one. check: 6 times an even digit ends in that digit (6 × 4 = 24, 6 × 8 = 48), so an even number's last digit never changes.",
    example: [6, 48],
    fits: (p) => p.a === 6 && p.b >= 11 && p.b < 100,
    work: ({ b }) => ({
      steps: [`${b} × 3 = ${b * 3}`, `${b * 3} × 2 = ${b * 6}`],
      result: b * 3 * 2,
    }),
  },
  {
    id: "mul-7",
    op: "mul",
    title: "× 7: five of it, plus two of it",
    idea: "seven is the table with no shortcut of its own. build it from the two easiest ones: half with a zero, plus a double.",
    example: [7, 46],
    fits: (p) => p.a === 7 && p.b >= 11 && p.b < 100,
    work: ({ b }) => ({
      steps: [`${b} × 5 = ${b * 5}`, `${b} × 2 = ${b * 2}`, `${b * 5} + ${b * 2} = ${b * 7}`],
      result: b * 5 + b * 2,
    }),
  },
  {
    id: "mul-left-to-right",
    op: "mul",
    title: "tens first, then ones",
    idea: "multiply the tens, then the ones, then add. it is the method everything above is a shortcut for, and you can often type the first digit before you have finished.",
    example: [3, 78],
    fits: (p) => p.a <= 9 && twoDigit(p.b) && ones(p.b) !== 0,
    work: ({ a, b }) => {
      const t = a * tens(b);
      const o = a * ones(b);
      return {
        steps: [`${a} × ${tens(b)} = ${t}`, `${a} × ${ones(b)} = ${o}`, `${t} + ${o} = ${t + o}`],
        result: t + o,
      };
    },
  },
  {
    id: "mul-ends-8-9",
    op: "mul",
    title: "ends in 8 or 9: overshoot",
    idea: "multiply the next round number and hand back the extra. 6 × 39 is six 40s minus one 6.",
    example: [6, 39],
    fits: (p) => p.b >= 18 && p.b < 100 && ones(p.b) >= 8 && p.a !== 10,
    work: ({ a, b }) => {
      const up = tens(b) + 10;
      const k = up - b;
      return {
        steps: [`${a} × ${up} = ${a * up}`, `${a} × ${k} = ${a * k}`, `${a * up} − ${a * k} = ${a * b}`],
        result: a * up - a * k,
      };
    },
  },
  {
    id: "mul-halve-double",
    op: "mul",
    title: "even times something ending in 5: halve and double",
    idea: "halve the even one and double the other. the 5 turns into a 0 and the problem shrinks.",
    example: [12, 45],
    fits: (p) => p.a % 2 === 0 && p.a >= 4 && p.a !== 10 && ones(p.b) === 5 && p.b >= 15,
    work: ({ a, b }) => ({
      steps: [`${a} ÷ 2 = ${a / 2}`, `${b} × 2 = ${b * 2}`, `${a / 2} × ${b * 2} = ${a * b}`],
      result: (a / 2) * (b * 2),
    }),
  },
  {
    id: "mul-double-digits",
    op: "mul",
    title: "33, 44, 77… : one digit, then × 11",
    idea: "a doubled digit is that digit times 11. do the small product from your tables, then use the 11 trick on it.",
    example: [7, 88],
    fits: (p) => p.b % 11 === 0 && twoDigit(p.b) && p.b > 11 && p.a <= 9 && p.a * (p.b / 11) >= 10,
    work: ({ a, b }) => {
      const d = b / 11;
      return {
        steps: [`${a} × ${d} = ${a * d}`, `${a * d} × 11 = ${a * b}`],
        result: a * d * 11,
      };
    },
  },
  {
    id: "mul-25-75",
    op: "mul",
    title: "× 25 and × 75: think quarters",
    idea: "four 25s make 100, like quarters in a dollar. for 75, do the 25s and triple it.",
    example: [8, 75],
    // 5, 9, 10 and 11 have a quicker move of their own.
    fits: (p) => (p.b === 25 || p.b === 75) && ![5, 9, 10, 11].includes(p.a),
    work: ({ a, b }) => {
      const q = a * 25;
      return {
        steps: [
          `${a} quarters: ${a} × 25 = ${q}`,
          ...(b === 75 ? [`${q} × 3 = ${q * 3}`] : []),
        ],
        result: b === 75 ? q * 3 : q,
      };
    },
  },
  {
    id: "mul-teens",
    op: "mul",
    title: "both in the teens: move the ones across",
    idea: "for 11 or 12 times a teen, add one number's ones onto the other, put a 0 on it, and add the product of the ones.",
    example: [12, 17],
    fits: (p) => (p.a === 11 || p.a === 12) && p.b >= 11 && p.b <= 19,
    work: ({ a, b }) => {
      const base = (b + ones(a)) * 10;
      const o = ones(a) * ones(b);
      return {
        steps: [
          `${b} + ${ones(a)} = ${b + ones(a)}, so ${base}`,
          `${ones(a)} × ${ones(b)} = ${o}`,
          `${base} + ${o} = ${base + o}`,
        ],
        result: base + o,
      };
    },
  },
  {
    id: "mul-15",
    op: "mul",
    title: "× 15: ten of it, plus half again",
    idea: "put a zero on the small number, then add half of what you just made.",
    example: [8, 15],
    fits: (p) => p.b === 15 && p.a !== 10,
    work: ({ a }) => ({
      steps: [`${a} × 10 = ${a * 10}`, `${a * 10} ÷ 2 = ${a * 5}`, `${a * 10} + ${a * 5} = ${a * 15}`],
      result: a * 10 + a * 5,
    }),
  },

  // ------------------------------------------------------------- division
  {
    id: "div-last-digit",
    op: "div",
    title: "÷ 3, 7, 9: the last digit gives it away",
    idea: "size tells you the tens. then look only at the last digit: each one comes from exactly one ones digit. nothing to carry, nothing to subtract, because the division always comes out even.",
    example: [518, 7],
    fits: (p) => [3, 7, 9].includes(p.b) && twoDigit(p.answer),
    work: ({ a, b }) => {
      const t = Math.floor(a / (b * 10)) * 10;
      const o = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => (b * d) % 10 === a % 10) as number;
      return {
        steps: [
          `tens: ${b} × ${t} = ${b * t} fits, ${b} × ${t + 10} = ${b * (t + 10)} doesn't`,
          `last digit ${a % 10}: ${b} × ${o} = ${b * o}`,
          `type ${t + o}`,
        ],
        result: t + o,
      };
    },
  },
  {
    id: "div-11",
    op: "div",
    title: "÷ 11: the × 11 trick in reverse",
    idea: "the last digit of the answer is the last digit of the question. drop that digit, subtract it from what is left, and you are looking at 11 times the tens digit.",
    example: [616, 11],
    fits: (p) => p.b === 11 && twoDigit(p.answer),
    work: ({ a }) => {
      const o = a % 10;
      const rest = Math.floor(a / 10);
      const t = (rest - o) / 11;
      return {
        steps: [`last digit: ${o}`, `${rest} − ${o} = ${rest - o}`, `${rest - o} ÷ 11 = ${t}`, `type ${t * 10 + o}`],
        result: t * 10 + o,
      };
    },
  },
  {
    id: "div-12",
    op: "div",
    title: "÷ 12: take the dozens out, finish with one",
    idea: "learn the tens of twelve: 120, 240, 360, 480, 600, 720, 840, 960, 1080. subtract the biggest that fits. what is left is a 12-times-table fact.",
    example: [564, 12],
    fits: (p) => p.b === 12 && twoDigit(p.answer) && ones(p.answer) !== 0,
    work: ({ a }) => {
      const t = Math.floor(a / 120) * 10;
      const left = a - 12 * t;
      return {
        steps: [`12 × ${t} = ${12 * t}`, `${a} − ${12 * t} = ${left}`, `${left} ÷ 12 = ${left / 12}`, `type ${t + left / 12}`],
        result: t + left / 12,
      };
    },
  },
  {
    id: "div-halfway",
    op: "div",
    title: "÷ 4, 6, 8, 12: two choices, check halfway",
    idea: "dividing by an even number, the last digit leaves two candidates exactly 5 apart. ask whether you are above or below the halfway point and pick.",
    example: [342, 6],
    fits: (p) => [4, 6, 8, 12].includes(p.b) && twoDigit(p.answer),
    work: ({ a, b }) => {
      const t = Math.floor(a / (b * 10)) * 10;
      const lo = [0, 1, 2, 3, 4].find((d) => (b * d) % 10 === a % 10) as number;
      const half = b * (t + 5);
      const o = a >= half ? lo + 5 : lo;
      return {
        steps: [
          `tens: ${t}. ends in ${a % 10}, so ${t + lo} or ${t + lo + 5}`,
          `halfway: ${b} × ${t + 5} = ${half}`,
          `${a} is ${a >= half ? "not below" : "below"} ${half}, so ${t + o}`,
        ],
        result: t + o,
      };
    },
  },
  {
    id: "div-5",
    op: "div",
    title: "÷ 5: double it, drop the zero",
    idea: "doubling first turns the 5 into a 10. the doubling never needs the last digit: a 5 adds one, a 0 adds nothing.",
    example: [435, 5],
    fits: (p) => p.b === 5 && p.answer >= 11,
    work: ({ a }) => ({
      steps: [`${a} × 2 = ${a * 2}`, `${a * 2} ÷ 10 = ${(a * 2) / 10}`],
      result: (a * 2) / 10,
    }),
  },
  {
    id: "div-4",
    op: "div",
    title: "÷ 4: halve, halve",
    idea: "halve from the left, twice. if a digit is odd, pass 10 to the next one along.",
    example: [348, 4],
    fits: (p) => p.b === 4 && p.answer >= 11,
    work: ({ a }) => ({
      steps: [`${a} ÷ 2 = ${a / 2}`, `${a / 2} ÷ 2 = ${a / 4}`],
      result: a / 2 / 2,
    }),
  },
  {
    id: "div-8",
    op: "div",
    title: "÷ 8: halve three times",
    idea: "or stop after two and use your 2-times table. either way you never touch the 8s.",
    example: [536, 8],
    fits: (p) => p.b === 8 && p.answer >= 11,
    work: ({ a }) => ({
      steps: [`${a} ÷ 2 = ${a / 2}`, `${a / 2} ÷ 2 = ${a / 4}`, `${a / 4} ÷ 2 = ${a / 8}`],
      result: a / 2 / 2 / 2,
    }),
  },
  {
    id: "div-6",
    op: "div",
    title: "÷ 6: halve, then ÷ 3",
    idea: "halving first brings the number down to one where the 3s are obvious.",
    example: [474, 6],
    fits: (p) => p.b === 6 && p.answer >= 11,
    work: ({ a }) => ({
      steps: [`${a} ÷ 2 = ${a / 2}`, `${a / 2} ÷ 3 = ${a / 6}`],
      result: a / 2 / 3,
    }),
  },
  {
    id: "div-9",
    op: "div",
    title: "÷ 9: ten minus the last digit",
    idea: "in the 9s the last digits run backwards, so the ones digit is 10 minus the last digit you see (a 0 stays 0). size gives the tens.",
    example: [423, 9],
    fits: (p) => p.b === 9 && twoDigit(p.answer) && ones(p.answer) !== 0,
    work: ({ a }) => {
      const t = Math.floor(a / 90) * 10;
      const o = 10 - (a % 10);
      return {
        steps: [`ones: 10 − ${a % 10} = ${o}`, `tens: 9 × ${t} = ${9 * t} fits`, `type ${t + o}`],
        result: t + o,
      };
    },
  },
  {
    id: "div-just-under",
    op: "div",
    title: "just under a round one: count back",
    idea: "if the number is a little short of a clean multiple, start from there. 693 is one 7 short of 700, so it is 99.",
    example: [693, 7],
    fits: (p) => p.answer >= 18 && p.answer < 100 && ones(p.answer) >= 8 && p.b !== 10,
    work: ({ a, b }) => {
      const up = Math.ceil(a / (b * 10)) * 10;
      const short = b * up - a;
      return {
        steps: [
          `${b} × ${up} = ${b * up}`,
          `${b * up} − ${a} = ${short}`,
          `${short / b === 1 ? `that is one ${b}` : `that is two ${b}s`}: ${up} − ${short / b} = ${up - short / b}`,
        ],
        result: up - short / b,
      };
    },
  },
  {
    id: "div-peel",
    op: "div",
    title: "peel off the tens",
    idea: "take out the biggest multiple of ten you can see, and the leftover is a times-table fact.",
    example: [468, 6],
    fits: (p) => p.b !== 10 && twoDigit(p.answer) && ones(p.answer) !== 0,
    work: ({ a, b }) => {
      const t = Math.floor(a / (b * 10)) * 10;
      const left = a - b * t;
      return {
        steps: [`${b} × ${t} = ${b * t}`, `${a} − ${b * t} = ${left}`, `${left} ÷ ${b} = ${left / b}`, `type ${t + left / b}`],
        result: t + left / b,
      };
    },
  },
];

export function exampleProblem(t: Trick): Problem {
  const [a, b] = t.example;
  const answer = { add: a + b, sub: a - b, mul: a * b, div: a / b }[t.op];
  return { op: t.op, a, b, answer };
}

const pools = new Map<Op, readonly Problem[]>();
function pool(op: Op): readonly Problem[] {
  let list = pools.get(op);
  if (!list) pools.set(op, (list = allProblems(op)));
  return list;
}

/** Fraction of this operation's standard problems the trick fits. Counted, not
 * estimated: the standard ranges are small enough to list. */
export function coverage(t: Trick): number {
  const all = pool(t.op);
  return all.filter(t.fits).length / all.length;
}

let ranked: readonly Trick[] | undefined;

/** The narrowest trick that fits: the one that says most about this problem. */
export function trickFor(p: Problem): Trick | undefined {
  ranked ??= TRICKS.map((t) => ({ t, share: coverage(t) }))
    .sort((x, y) => x.share - y.share)
    .map(({ t }) => t);
  return ranked.find((t) => t.op === p.op && t.fits(p));
}

/** A fresh problem the trick fits. Drawn from the real ranges, so a drill feels
 * like the game narrowed down to one move. */
export function sample(t: Trick, last?: Problem, rng: () => number = Math.random): Problem {
  const fitting = pool(t.op).filter(
    (p) => t.fits(p) && !(last && p.a === last.a && p.b === last.b),
  );
  return fitting[Math.floor(rng() * fitting.length)] ?? exampleProblem(t);
}
