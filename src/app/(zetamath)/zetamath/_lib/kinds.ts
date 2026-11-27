/* The general sorts of problem the stats tab splits answers into: "7 × …",
 * "carries", "3-digit − 2-digit". Pure, like problems.ts, so that
 * scripts/verify-stats.mts can check every problem lands where it should.
 *
 * Each operation has a few groups. A group marked `every` splits that
 * operation's problems with nothing left over and nothing counted twice, so its
 * kinds can be compared with each other. The rest only pick some problems out. */

import type { Op, Problem } from "./problems.ts";

export type Kind = {
  /** Stable, and safe in a URL: "mul.first.7". */
  id: string;
  op: Op;
  group: Group;
  label: string;
  /** Place within its group. */
  order: number;
};

export type Group = {
  key: string;
  /** What its kinds split problems by. */
  name: string;
  every: boolean;
  /** Place among the operation's groups. */
  order: number;
};

type Entry = [key: string, label: string, order: number];

type Sorter = {
  key: string;
  name: string;
  every: boolean;
  /** One entry for each kind of this group the problem is. */
  sort: (p: Problem) => Entry[];
};

const when = (yes: boolean, ...entry: Entry): Entry[] => (yes ? [entry] : []);

const digits = (n: number) => String(n).length;
const ones = (n: number) => n % 10;
const sized = (n: number, word: string) => `${n}-digit${word}`;

/** For the bigger number of a multiplication or division: the teens apart from
 * the rest of the two-digit numbers, because they have a move of their own. */
function band(n: number): [key: string, words: string, order: number] {
  if (n < 10) return ["1", "one digit", 1];
  if (n < 20) return ["teens", "10–19", 2];
  if (n < 100) return ["2", "20–99", 3];
  return [String(digits(n)), `${digits(n)} digits`, digits(n) + 1];
}

/** Small factors are few, so each gets its own kind until they are not. */
const OWN_ROW = 20;

const SORTERS: Record<Op, readonly Sorter[]> = {
  add: [
    {
      key: "carry",
      name: "carrying",
      every: true,
      sort: ({ a, b }) => [ones(a) + ones(b) >= 10 ? ["yes", "carries", 0] : ["no", "no carry", 1]],
    },
    {
      key: "size",
      name: "size",
      every: true,
      sort: ({ a, b }) => {
        const [lo, hi] = [digits(a), digits(b)].sort((x, y) => x - y);
        return [[`${lo}${hi}`, `${sized(lo, "")} + ${sized(hi, "")}`, lo * 10 + hi]];
      },
    },
    {
      key: "answer",
      name: "answer",
      every: true,
      sort: ({ answer }) => [[String(digits(answer)), sized(digits(answer), " answer"), digits(answer)]],
    },
    {
      key: "shape",
      name: "also",
      every: false,
      sort: ({ a, b }) => [
        ...when(a === b, "double", "doubles", 0),
        ...when(a !== b && a >= 11 && b >= 11 && Math.abs(a - b) <= 3, "near", "near doubles", 1),
        ...when(ones(a) === 0 || ones(b) === 0, "ten", "with a multiple of 10", 2),
        ...when(ones(a) === 9 || ones(b) === 9, "nine", "with a number ending in 9", 3),
      ],
    },
  ],
  sub: [
    {
      key: "borrow",
      name: "borrowing",
      every: true,
      sort: ({ a, b }) => [ones(a) < ones(b) ? ["yes", "borrows", 0] : ["no", "no borrow", 1]],
    },
    {
      key: "size",
      name: "size",
      every: true,
      sort: ({ a, b }) => [
        [`${digits(a)}${digits(b)}`, `${sized(digits(a), "")} − ${sized(digits(b), "")}`, digits(a) * 10 + digits(b)],
      ],
    },
    {
      key: "answer",
      name: "answer",
      every: true,
      sort: ({ answer }) => [[String(digits(answer)), sized(digits(answer), " answer"), digits(answer)]],
    },
    {
      key: "shape",
      name: "also",
      every: false,
      sort: ({ a, b, answer }) => [
        ...when(a > 100 && answer < 100, "through", "crosses 100", 0),
        ...when(ones(b) === 0, "ten", "takes away a multiple of 10", 1),
        ...when(ones(b) === 9, "nine", "takes away a number ending in 9", 2),
      ],
    },
  ],
  mul: [
    {
      key: "first",
      name: "first number",
      every: true,
      sort: ({ a }) => [
        a <= OWN_ROW ? [String(a), `${a} × …`, a] : [`d${digits(a)}`, `${sized(digits(a), "")} × …`, 100 + digits(a)],
      ],
    },
    {
      key: "second",
      name: "second number",
      every: true,
      sort: ({ b }) => {
        const [key, words, order] = band(b);
        return [[key, `… × ${words}`, order]];
      },
    },
    {
      key: "shape",
      name: "also",
      every: false,
      sort: ({ a, b }) => [
        ...when(a <= 12 && b <= 12, "table", "times-table facts", 0),
        ...when(a === b, "square", "squares", 1),
        ...when(b >= 10 && ones(b) === 0, "ten", "× a multiple of 10", 2),
        ...when(ones(b) === 5, "five", "× a number ending in 5", 3),
        ...when(b >= 10 && ones(b) >= 8, "nine", "× a number ending in 8 or 9", 4),
      ],
    },
  ],
  div: [
    {
      key: "by",
      name: "dividing by",
      every: true,
      sort: ({ b }) => [
        b <= OWN_ROW ? [String(b), `÷ ${b}`, b] : [`d${digits(b)}`, `÷ ${sized(digits(b), "")}`, 100 + digits(b)],
      ],
    },
    {
      key: "answer",
      name: "answer",
      every: true,
      sort: ({ answer }) => {
        const [key, words, order] = band(answer);
        return [[key, `answer ${words}`, order]];
      },
    },
    {
      key: "shape",
      name: "also",
      every: false,
      sort: ({ b, answer }) => [
        ...when(b <= 12 && answer <= 12, "table", "times-table facts", 0),
        ...when(answer >= 10 && ones(answer) === 0, "ten", "answer a multiple of 10", 1),
        ...when(ones(answer) === 5, "five", "answer ending in 5", 2),
      ],
    },
  ],
};

const groups = (op: Op): Group[] =>
  SORTERS[op].map(({ key, name, every }, order) => ({ key, name, every, order }));

export const GROUPS: Record<Op, readonly Group[]> = {
  add: groups("add"),
  sub: groups("sub"),
  mul: groups("mul"),
  div: groups("div"),
};

/** One object per kind, so they can be compared and used as keys. */
const made = new Map<string, Kind>();

export function kindsOf(p: Problem): Kind[] {
  return SORTERS[p.op].flatMap((sorter, i) =>
    sorter.sort(p).map(([key, label, order]) => {
      const id = `${p.op}.${sorter.key}.${key}`;
      let kind = made.get(id);
      if (!kind) made.set(id, (kind = { id, op: p.op, group: GROUPS[p.op][i], label, order }));
      return kind;
    }),
  );
}

/** Group order, then place in the group. */
export const kindOrder = (x: Kind, y: Kind) =>
  x.group.order - y.group.order || x.order - y.order || (x.id < y.id ? -1 : 1);
