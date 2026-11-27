/* Checks supabase/migrations against a real Postgres, in this process:
 *   node scripts/test-db.mts
 * Everything goes through the public functions as the anonymous role, which is
 * all a stranger with the publishable key can do. The Google ones are called as
 * service_role, as only the server can, with the secret key. */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { callAs, callAsAnon, open } from "../src/app/(zetamath)/zetamath/_server/devdb.ts";
import { parseRun } from "../src/app/(zetamath)/zetamath/_lib/runs.ts";
import { settingsKey, STANDARD, STANDARD_KEY } from "../src/app/(zetamath)/zetamath/_lib/problems.ts";

const db = await open();
await db.exec(`insert into zetamath.accounts (username, password_hash, owner)
  values ('blo', zetamath.hash_password('owner pass'), true)`);

type Answer = {
  error?: string;
  ok?: boolean;
  token: string;
  account: { username: string; owner: boolean; password?: boolean; google?: boolean } | null;
  runs: { id: string; score: number; excluded: boolean; at: number }[];
  replaced: string[];
};

const call = async (fn: string, args: Record<string, unknown> = {}) =>
  (await callAsAnon(db, `zetamath_${fn}`, args)) as Answer;
const signUp = (u: unknown, p: unknown) => call("sign_up", { p_username: u, p_password: p });
const logIn = (u: unknown, p: unknown) => call("log_in", { p_username: u, p_password: p });
const read = (t: unknown) => call("read", { p_token: t });
const save = (t: unknown, u: unknown, runs: unknown) =>
  call("save", { p_token: t, p_username: u, p_runs: runs });
const answersOf = async (t: unknown, from: unknown = "2019-12-31", to: unknown = "2100-01-02") =>
  (await callAsAnon(db, "zetamath_answers", { p_token: t, p_from: from, p_to: to })) as Record<string, unknown>;
const one = async (sql: string) => Object.values((await db.query<Record<string, unknown>>(sql)).rows[0])[0];
const asServer = async (fn: string, args: Record<string, unknown>) =>
  (await callAs(db, `zetamath_${fn}`, args, "service_role")) as Answer;
const googleEnter = (sub: unknown, username?: unknown) =>
  asServer("google_enter", username === undefined ? { p_google: sub } : { p_google: sub, p_username: username });
const googleLink = (t: unknown, u: unknown, p: unknown, sub: unknown) =>
  asServer("google_link", { p_token: t, p_username: u, p_password: p, p_google: sub });
const googleUnlink = (t: unknown, u: unknown, p: unknown) =>
  call("google_unlink", { p_token: t, p_username: u, p_password: p });
const googleDelete = (t: unknown, u: unknown, sub: unknown) =>
  asServer("google_delete", { p_token: t, p_username: u, p_google: sub });
const passwordAccount = (username: string) => ({ username, owner: false, password: true, google: false });

const AT = Date.UTC(2026, 10, 25, 19, 45, 12, 345);
const run = (over: Record<string, unknown> = {}) => ({
  id: randomUUID(),
  at: AT,
  day: "2026-11-25",
  offset: 300,
  score: 27,
  seconds: 120,
  settings: STANDARD_KEY,
  ops: { add: [7, 29000], sub: [6, 27840], mul: [8, 54400], div: [6, 38940] },
  excluded: false,
  ...over,
});

let count = 0;
async function test(name: string, body: () => Promise<void>) {
  try {
    await body();
    count++;
  } catch (e) {
    console.error(`FAILED: ${name}`);
    throw e;
  }
}

await test("sign up, log in, log out", async () => {
  const made = await signUp("friend", "password1");
  assert.match(made.token, /^[0-9a-f]{64}$/);
  assert.deepEqual(made.account, { username: "friend", owner: false });
  assert.deepEqual((await read(made.token)).account, passwordAccount("friend"));
  assert.equal((await signUp("friend", "password2")).error, "taken");
  assert.equal((await logIn("friend", "nope")).error, "wrong");
  assert.equal((await logIn("nobody", "password1")).error, "wrong");
  const again = await logIn("friend", "password1");
  assert.notEqual(again.token, made.token);
  await call("log_out", { p_token: again.token });
  assert.equal((await read(again.token)).account, null);
  assert.deepEqual((await read(made.token)).account, passwordAccount("friend"));
});

await test("the rules for names and passwords", async () => {
  for (const bad of ["ab", "a".repeat(21), "Friend", "a b c", "frïend", "", "abc\n", null]) {
    assert.equal((await signUp(bad, "password1")).error, "bad_username", String(bad));
  }
  for (const bad of ["short12", "", "x".repeat(73), "é".repeat(37), null]) {
    assert.equal((await signUp("valid_name", bad)).error, "bad_password", String(bad));
  }
  assert.equal((await logIn("friend", null)).error, "wrong");
  assert.equal((await logIn(null, null)).error, "wrong");
  // Nothing past bcrypt's 72 bytes is ever accepted, so nothing can match early.
  const long = await signUp("long_one", "y".repeat(72));
  assert.ok(long.token);
  assert.equal((await logIn("long_one", "y".repeat(73))).error, "wrong");
});

await test("no password or token is stored readable", async () => {
  const { token } = await logIn("friend", "password1");
  const dump = JSON.stringify([
    (await db.query("select * from zetamath.accounts")).rows,
    (await db.query("select encode(token_hash, 'hex') h, encode(token_hash, 'escape') e from zetamath.sessions")).rows,
  ]);
  assert.ok(!dump.includes("password1"));
  assert.ok(!dump.includes(token) && !dump.includes(Buffer.from(token).toString("hex")));
  assert.ok(dump.includes("$2a$10$"));
});

await test("a run comes back exactly as it went in", async () => {
  const { token } = await logIn("friend", "password1");
  const sent = run();
  assert.deepEqual((await save(token, "friend", [sent])).replaced, []);
  const { runs } = await read(token);
  assert.deepEqual(runs, [sent]);
  assert.deepEqual(parseRun(runs[0]), sent);
  // And one with nothing optional.
  const bare: Record<string, unknown> = run({ at: AT + 600_000, score: 0, ops: {} });
  delete bare.offset;
  await save(token, "friend", [bare]);
  assert.deepEqual(parseRun((await read(token)).runs[1]), bare);
});

await test("every answer is kept, and kept once", async () => {
  const { token } = await signUp("answerer", "password1");
  const answers = [
    [0, 67, 58, 1500, 0],
    [1, 143, 87, 4100, 2],
    [2, 7, 58, 3200, 1],
    [3, 84, 12, 2100, 0],
  ];
  const ops = { add: [1, 1500], sub: [1, 4100], mul: [1, 3200], div: [1, 2100] };
  const sent = run({ score: 4, ops, answers });
  await save(token, "answerer", [sent]);
  // The runs come without them, and the answers apart, by run.
  const [back] = (await read(token)).runs;
  const bare: Record<string, unknown> = { ...sent };
  delete bare.answers;
  assert.deepEqual(back, bare);
  assert.deepEqual(await answersOf(token), { [sent.id]: answers });
  assert.deepEqual(parseRun({ ...back, answers: (await answersOf(token))[sent.id] }), sent);

  // Like the score: a second copy can leave it out, and change nothing else.
  const changed = answers.map(([op, a, b]) => [op, a, b, 1, 0]);
  await save(token, "answerer", [{ ...sent, answers: changed, excluded: true }]);
  assert.equal((await read(token)).runs[0].excluded, true);
  assert.deepEqual((await answersOf(token))[sent.id], answers);

  // A run with none, as every run had before these were kept: there, as null.
  const before = run({ at: AT + 60_000 });
  await save(token, "answerer", [before]);
  const empty = run({ at: AT + 120_000, score: 0, ops: {}, answers: [] });
  await save(token, "answerer", [empty]);
  assert.deepEqual(await answersOf(token), { [sent.id]: answers, [before.id]: null, [empty.id]: [] });

  const one = (answer: unknown) => run({ score: 1, ops: { add: [1, 1500] }, answers: [answer] });
  const bad = [
    run({ score: 2, answers: [[0, 1, 2, 3, 0]] }),
    run({ score: 1, answers: [[0, 1, 2, 3, 0], [0, 1, 2, 3, 0]] }),
    run({ score: 1, answers: "x" }),
    run({ score: 1, answers: { 0: [0, 1, 2, 3, 0] } }),
    one([4, 1, 2, 3, 0]),
    one([-1, 1, 2, 3, 0]),
    one([0, -1, 2, 3, 0]),
    one([0, 1.5, 2, 3, 0]),
    one([0, 1, 2, 3]),
    one([0, 1, 2, 3, 0, 0]),
    one([0, 123_456_789, 2, 3, 0]),
    one([0, 1, 12_345, 3, 0]),
    one([0, 1, 2, 12_345_678, 0]),
    one([0, 1, 2, 3, 100]),
    one(["0", 1, 2, 3, 0]),
    one([0, 1, 2, 3, null]),
    one({ op: 0 }),
    one(null),
  ];
  for (const r of bad) {
    assert.equal(parseRun(r), null, JSON.stringify(r.answers));
    await assert.rejects(save(token, "answerer", [run(), r]), undefined, JSON.stringify(r.answers));
  }
  assert.equal((await read(token)).runs.length, 3);
  assert.equal(Object.keys(await answersOf(token)).length, 3);

  // The shape is all the database can see. A sum that comes out negative, or a
  // division with a remainder, gets in only by going around the site, and the
  // browser will not show it.
  for (const answer of [[1, 5, 9, 100, 0], [3, 10, 3, 100, 0], [3, 10, 0, 100, 0]]) {
    assert.equal(parseRun(one(answer)), null, JSON.stringify(answer));
  }
  assert.ok(parseRun(one([1, 9, 9, 100, 0])), "zero is a fine difference");
});

await test("answers come only to their own account, for the days asked", async () => {
  const { token } = await signUp("days_apart", "password1");
  const answered = (day: string, at: number, answer = [0, 2, 3, 900, 0]) =>
    run({ day, at, score: 1, ops: { add: [1, answer[3]] }, answers: [answer] });
  // By the day on the clock of whoever played: late on the 24th there is the
  // 25th in UTC.
  const late = { ...answered("2026-11-24", Date.UTC(2026, 10, 25, 3)), offset: 300 };
  const [first, middle, last] = [
    answered("2026-11-23", Date.UTC(2026, 10, 23, 12)),
    answered("2026-11-25", Date.UTC(2026, 10, 25, 12)),
    answered("2026-11-26", Date.UTC(2026, 10, 26, 12)),
  ];
  await save(token, "days_apart", [first, late, middle, last]);
  const ids = async (from: string, to: string) => Object.keys(await answersOf(token, from, to)).sort();
  const sorted = (...runs: { id: string }[]) => runs.map((r) => r.id).sort();

  // Both ends are in, and nothing past them.
  assert.deepEqual(await ids("2026-11-24", "2026-11-25"), sorted(late, middle));
  assert.deepEqual(await ids("2026-11-25", "2026-11-25"), sorted(middle));
  assert.deepEqual(await ids("2026-11-23", "2026-11-26"), sorted(first, late, middle, last));
  assert.deepEqual(await ids("2026-11-27", "2026-12-31"), []);
  assert.deepEqual(await ids("2019-12-31", "2026-11-22"), []);
  assert.deepEqual((await answersOf(token, "2026-11-24", "2026-11-24"))[late.id], late.answers);

  for (const [from, to] of [["2026-11-25", "2026-11-24"], [null, "2026-11-25"], ["2026-11-25", null], [null, null]]) {
    assert.equal((await answersOf(token, from, to)).error, "bad_range", `${from} to ${to}`);
  }

  // A stranger gets nothing, with or without a token that looks right.
  for (const stranger of [null, "", "0".repeat(64), `${token}0`, token.toUpperCase()]) {
    assert.deepEqual(await answersOf(stranger), { error: "not_logged_in" }, String(stranger));
  }

  // Someone else's runs on the same days stay theirs, the same run id too.
  const other = await signUp("days_other", "password1");
  const theirs = { ...middle, answers: [[2, 7, 8, 4000, 3]] };
  await save(other.token, "days_other", [theirs, answered("2026-11-25", Date.UTC(2026, 10, 25, 13))]);
  assert.deepEqual((await answersOf(token, "2026-11-25", "2026-11-25"))[middle.id], middle.answers);
  assert.deepEqual((await answersOf(other.token, "2026-11-25", "2026-11-25"))[middle.id], theirs.answers);
  assert.equal(Object.keys(await answersOf(other.token)).length, 2);
  assert.equal(Object.keys(await answersOf(token)).length, 4);

  // A run typed in by hand and hidden behind the real one is gone here too.
  const typed = String(
    await one(`insert into zetamath.runs (account_id, id, played_at, day, score, seconds, settings, by_hand)
      select id, gen_random_uuid(), '2026-11-25 07:00:00+00', '2026-11-25', 1, 120, '${STANDARD_KEY}', true
      from zetamath.accounts where username = 'days_apart' returning id`),
  );
  assert.equal((await answersOf(token, "2026-11-25", "2026-11-25"))[typed], null);
  const real = { ...answered("2026-11-25", Date.UTC(2026, 10, 25, 7, 0, 30)), seconds: 120 };
  assert.deepEqual((await save(token, "days_apart", [real])).replaced, [typed]);
  assert.ok(!(typed in (await answersOf(token, "2026-11-25", "2026-11-25"))));
  // Tests below count every run typed in by hand.
  await db.exec(`delete from zetamath.runs where id = '${typed}'`);

  // Logged out, none.
  await call("log_out", { p_token: other.token });
  assert.deepEqual(await answersOf(other.token), { error: "not_logged_in" });
});

await test("a score is written once", async () => {
  const { token } = await logIn("friend", "password1");
  const [first] = (await read(token)).runs;
  await save(token, "friend", [{ ...first, score: 99, excluded: true }]);
  const [after] = (await read(token)).runs;
  assert.equal(after.score, 27);
  assert.equal(after.excluded, true);
  await save(token, "friend", [{ ...first, excluded: false }]);
  assert.equal((await read(token)).runs[0].excluded, false);
  const other = { at: AT + 1, day: "2026-11-24", offset: 0, seconds: 60, settings: "a.a2-9+2-9.60s", ops: {} };
  await save(token, "friend", [{ ...first, ...other }]);
  assert.deepEqual((await read(token)).runs[0], first);
});

await test("everyone sees their own runs and nobody else's", async () => {
  const owner = await logIn("blo", "owner pass");
  assert.equal(owner.account?.owner, true);
  await save(owner.token, "blo", [run({ score: 31 })]);
  for (const stranger of [await read(null), await call("read"), await read("0".repeat(64))]) {
    assert.deepEqual(stranger, { account: null, runs: [] });
  }
  const friend = await read((await logIn("friend", "password1")).token);
  assert.deepEqual(friend.runs.map((r) => r.score), [27, 0]);
  assert.deepEqual((await read(owner.token)).runs.map((r) => r.score), [31]);
});

await test("the owner's first name is not up for grabs", async () => {
  assert.equal((await signUp("brendan", "password1")).error, "taken");
});

await test("the same run id in two accounts stays two runs", async () => {
  const { token } = await logIn("friend", "password1");
  const mine = (await read(token)).runs[0];
  const other = await signUp("other_one", "password1");
  await save(other.token, "other_one", [{ ...mine, score: 5, excluded: true }]);
  assert.equal((await read(token)).runs[0].score, 27);
  assert.equal((await read(token)).runs[0].excluded, false);
  assert.equal((await read(other.token)).runs[0].score, 5);
});

await test("saving needs the right account", async () => {
  const { token } = await logIn("friend", "password1");
  assert.equal((await save(null, "friend", [run()])).error, "not_logged_in");
  assert.equal((await save("0".repeat(64), "friend", [run()])).error, "not_logged_in");
  assert.equal((await save(token, "blo", [run()])).error, "other_account");
  assert.equal((await save(token, null, [run()])).error, "other_account");
  assert.equal((await read(token)).runs.length, 2);
});

await test("malformed runs are refused whole", async () => {
  const { token } = await logIn("friend", "password1");
  for (const bad of [{}, '"x"', null, 5]) {
    assert.equal((await save(token, "friend", bad)).error, "bad_runs");
  }
  assert.equal((await save(token, "friend", Array(201).fill(run()))).error, "bad_runs");
  const bad: Record<string, unknown>[] = [
    { id: "x" }, { id: null }, { at: null }, { at: 5 }, { at: 1e15 }, { day: "2026-02-31" },
    { day: "infinity" }, { day: null }, { score: -1 }, { score: 5001 }, { score: 1.5 },
    { seconds: 0 }, { seconds: 4000 }, { settings: "<b>hi</b>" }, { settings: `${STANDARD_KEY}\n` },
    { settings: "" }, { settings: null }, { offset: 901 }, { ops: [] }, { ops: "x" },
    { ops: { pow: [1, 2] } }, { ops: { add: [1] } }, { ops: { add: [1, 2, 3] } },
    { ops: { add: [-1, 2] } }, { ops: { add: ["1", 2] } }, { ops: { add: { a: 1 } } },
    { excluded: "maybe" },
  ];
  for (const over of bad) {
    await assert.rejects(save(token, "friend", [run(), run(over)]), undefined, JSON.stringify(over));
  }
  assert.equal((await read(token)).runs.length, 2);
  // by_hand cannot be set from outside, and a repeated id is one run.
  const twice = run({ at: AT + 900_000, by_hand: true });
  await save(token, "friend", [twice, twice]);
  assert.equal((await read(token)).runs.length, 3);
  assert.equal(await one("select count(*)::int from zetamath.runs where by_hand"), 0);
});

await test("the database accepts every settings key the game can make", async () => {
  const { token } = await logIn("other_one", "password1");
  const ops = ["add", "sub", "mul", "div"] as const;
  const runs = [];
  for (let mask = 1; mask < 16; mask++) {
    const on = Object.fromEntries(ops.map((op, i) => [op, Boolean(mask & (1 << i))])) as Record<
      (typeof ops)[number],
      boolean
    >;
    runs.push(run({ settings: settingsKey({ ...STANDARD, on, add: [[0, 9999], [0, 9999]], seconds: 600 }) }));
  }
  assert.equal((await save(token, "other_one", runs)).error, undefined);
});

await test("a real run takes the place of the one typed in by hand", async () => {
  const owner = await logIn("blo", "owner pass");
  const typed = async (time: string, score: number) =>
    String(
      await one(`insert into zetamath.runs
        (account_id, id, played_at, day, utc_offset, score, seconds, settings, by_hand)
        select id, gen_random_uuid(), '2026-11-25 ${time}-05', '2026-11-25', 300, ${score}, 120,
          '${STANDARD_KEY}', true from zetamath.accounts where owner returning id`),
    );
  const seen = async () => (await read(owner.token)).runs;
  const has = async (id: unknown) => (await seen()).some((r) => r.id === id);
  const put = async (...runs: unknown[]) => (await save(owner.token, "blo", runs)).replaced;

  const x = await typed("14:45", 27);
  const y = await typed("14:39", 17);
  // Same minute but another score, same score but another minute, another length.
  assert.deepEqual(await put(run({ score: 26 })), []);
  assert.deepEqual(await put(run({ at: AT + 60_000 }), run({ at: AT - 60_000 })), []);
  assert.deepEqual(await put(run({ seconds: 60 })), []);
  assert.ok((await has(x)) && (await has(y)));

  // Its settings may differ: whoever typed it in had to guess.
  const real = run({ settings: "as.a2-100+2-100.120s" });
  const n = (await seen()).length;
  assert.deepEqual(await put(real), [x]);
  assert.ok((await has(real.id)) && !(await has(x)) && (await has(y)));
  assert.equal((await seen()).length, n);
  assert.deepEqual(await put(real), [x], "a lost reply can be asked for again");

  // A tab that still shows it can touch it without bringing it back.
  const stale = { ...run(), id: x, excluded: true };
  assert.deepEqual(await put(stale), [x]);
  assert.ok(!(await has(x)));
  assert.equal((await seen()).find((r) => r.id === real.id)?.excluded, false);

  // Left out in the same batch, by someone who can see both: the real one stays in.
  const out = async (id: unknown) => (await seen()).find((r) => r.id === id)?.excluded;
  const typedRun = (id: string, minute: number, score: number) => ({
    ...run({ at: Date.UTC(2026, 10, 25, 19, minute), score }),
    id,
    excluded: true,
  });
  const real2 = run({ at: Date.UTC(2026, 10, 25, 19, 39, 59, 999), score: 17 });
  assert.deepEqual(new Set(await put(real2, typedRun(y, 39, 17))), new Set([x, y]));
  assert.equal(await out(real2.id), false);

  // Left out earlier: so is the real one, until it is put back.
  const w = await typed("14:34", 15);
  await put(typedRun(w, 34, 15));
  const real3 = run({ at: Date.UTC(2026, 10, 25, 19, 34, 20), score: 15 });
  assert.ok((await put(real3)).includes(w));
  assert.equal(await out(real3.id), true);
  await put({ ...real3, excluded: false });
  assert.equal(await out(real3.id), false);

  // Typed in after the real one was already here: caught at the next save.
  const late = await typed("14:45", 27);
  assert.equal((await put(real)).length, 4);
  assert.ok(!(await has(late)));

  // Nobody else's run can do it.
  const z = await typed("14:30", 23);
  const friend = await logIn("friend", "password1");
  await save(friend.token, "friend", [run({ at: Date.UTC(2026, 10, 25, 19, 30, 5), score: 23 })]);
  assert.ok(await has(z));
});

await test("changing the password logs out everywhere else", async () => {
  const a = await logIn("friend", "password1");
  const b = await logIn("friend", "password1");
  const bystander = await logIn("other_one", "password1");
  const change = (t: unknown, current: unknown, next: unknown, u = "friend") =>
    call("change_password", { p_token: t, p_username: u, p_current: current, p_next: next });
  assert.equal((await change(null, "password1", "password2")).error, "not_logged_in");
  assert.equal((await change(a.token, "password1", "password2", "other_one")).error, "other_account");
  assert.equal((await change(a.token, "password1", "short")).error, "bad_password");
  assert.equal((await change(a.token, "wrong one", "password2")).error, "wrong");
  assert.equal((await change(a.token, "password1", "password2")).ok, true);
  assert.ok((await read(a.token)).account);
  assert.equal((await read(b.token)).account, null);
  assert.ok((await read(bystander.token)).account, "and nobody else out");
  assert.equal((await logIn("friend", "password1")).error, "wrong");
  assert.ok((await logIn("friend", "password2")).token);
});

await test("ten wrong passwords, then a wait", async () => {
  await db.exec("delete from zetamath.attempts");
  const { token } = await signUp("target", "password1");
  for (let i = 0; i < 10; i++) assert.equal((await logIn("target", `guess ${i}`)).error, "wrong");
  assert.equal((await logIn("target", "password1")).error, "slow_down");
  assert.equal(
    (
      await call("change_password", {
        p_token: token,
        p_username: "target",
        p_current: "password1",
        p_next: "password2",
      })
    ).error,
    "slow_down",
  );
  assert.equal(
    (await call("delete_account", { p_token: token, p_username: "target", p_password: "password1" })).error,
    "slow_down",
  );
  assert.ok((await read(token)).account, "still logged in where they already were");
  assert.equal(await one("select count(*)::int from zetamath.attempts"), 10);
  await db.exec("update zetamath.attempts set at = at - interval '16 minutes'");
  assert.ok((await logIn("target", "password1")).token);
  assert.equal(await one("select count(*)::int from zetamath.attempts where not ok"), 0);
});

await test("one account's log-ins do nothing for another's", async () => {
  await signUp("victim", "password1");
  for (let i = 0; i < 9; i++) assert.equal((await logIn("victim", "nope")).error, "wrong");
  assert.ok((await logIn("friend", "password2")).token);
  assert.equal((await logIn("friend", "nope")).error, "wrong");
  assert.equal((await logIn("victim", "nope")).error, "wrong");
  assert.equal((await logIn("victim", "nope")).error, "slow_down");
});

await test("a right password clears the wrong ones, but not the total", async () => {
  await signUp("busybody", "password1");
  for (let i = 0; i < 9; i++) await logIn("busybody", "nope");
  assert.ok((await logIn("busybody", "password1")).token);
  for (let i = 0; i < 9; i++) assert.equal((await logIn("busybody", "nope")).error, "wrong");
  let n = 1;
  while ((await logIn("busybody", "password1")).token && n < 100) n++;
  assert.equal(n, 40);
  assert.equal((await logIn("friend", "password2")).error, undefined, "others are not held up");
});

await test("deleting an account takes everything with it", async () => {
  const { token } = await signUp("leaving", "password1");
  await save(token, "leaving", [run()]);
  const del = (t: unknown, p: unknown, u = "leaving") =>
    call("delete_account", { p_token: t, p_username: u, p_password: p });
  assert.equal((await del(token, "nope")).error, "wrong");
  assert.equal((await del(token, "password1", "friend")).error, "other_account");
  assert.equal((await del(null, "password1")).error, "not_logged_in");
  assert.equal((await del(token, "password1")).ok, true);
  assert.equal((await read(token)).account, null);
  assert.equal((await logIn("leaving", "password1")).error, "wrong");
  assert.ok((await signUp("leaving", "password9")).token, "the name is free again");
  assert.equal(
    await one("select count(*)::int from zetamath.sign_ups"),
    Number(await one("select count(*) from zetamath.accounts where not owner")) + 1,
    "and the sign-up still counts",
  );
  const owner = await logIn("blo", "owner pass");
  assert.equal((await del(owner.token, "owner pass", "blo")).error, "owner");
});

await test("sessions expire and are capped", async () => {
  const first = await signUp("many", "password1");
  for (let i = 0; i < 25; i++) await logIn("many", "password1");
  assert.equal(
    await one(`select count(*)::int from zetamath.sessions s join zetamath.accounts a
      on a.id = s.account_id where a.username = 'many'`),
    20,
  );
  assert.equal((await read(first.token)).account, null, "oldest went first");
  const last = await logIn("many", "password1");
  assert.equal(
    await one(`select count(*)::int from zetamath.sessions
      where expires_at not between now() + interval '179 days' and now() + interval '181 days'`),
    0,
  );
  await db.exec("update zetamath.sessions set expires_at = now()");
  assert.equal((await read(last.token)).account, null);
});

await test("the owner can reset any password from the SQL editor", async () => {
  const b = await logIn("blo", "owner pass");
  assert.equal(await one("select zetamath.set_password('blo', 'a new one')"), true);
  assert.equal(await one("select zetamath.set_password('nobody', 'a new one')"), false);
  await assert.rejects(one(`select zetamath.set_password('blo', '${"x".repeat(73)}')`));
  assert.equal((await read(b.token)).account, null);
  assert.ok((await logIn("blo", "a new one")).token);
});

await test("answers a day are capped, the owner's aside", async () => {
  const { token } = await signUp("chatty", "password1");
  const full = (score: number) =>
    run({ score, seconds: 3600, ops: { add: [score, score] }, answers: Array(score).fill([0, 1, 1, 1, 0]) });
  // Exactly at the cap is fine, in one save.
  assert.deepEqual((await save(token, "chatty", [full(5000), full(5000), full(5000), full(5000)])).replaced, []);
  assert.equal((await save(token, "chatty", [full(1)])).error, "slow_down");
  assert.deepEqual((await save(token, "chatty", [run()])).replaced, [], "a run without answers still saves");
  const [first] = (await read(token)).runs;
  assert.deepEqual(
    (await save(token, "chatty", [{ ...first, excluded: true }])).replaced,
    [],
    "and one already saved can still be left out",
  );
  // A day later there is room again.
  await db.exec("update zetamath.runs set saved_at = saved_at - interval '2 days'");
  assert.deepEqual((await save(token, "chatty", [full(1)])).replaced, []);
  const owner = await logIn("blo", "a new one");
  assert.equal((await save(owner.token, "blo", Array.from({ length: 5 }, () => full(5000)))).error, undefined);
  await db.exec("delete from zetamath.accounts where username = 'chatty'");
});

await test("limits on runs and sign-ups", async () => {
  const { token } = await signUp("grinder", "password1");
  const fill = (n: number, saved: string) =>
    db.exec(`insert into zetamath.runs (account_id, id, played_at, day, score, seconds, settings, saved_at)
      select id, gen_random_uuid(), now(), '2026-11-25', 1, 120, '${STANDARD_KEY}', ${saved}
      from zetamath.accounts, generate_series(1, ${n}) where username = 'grinder'`);
  await fill(1000, "now()");
  assert.equal((await save(token, "grinder", [run()])).error, "slow_down");
  await db.exec("update zetamath.runs set saved_at = now() - interval '2 days'");
  const kept = run();
  assert.deepEqual((await save(token, "grinder", [kept])).replaced, []);
  await fill(18_999, "now() - interval '2 days'");
  assert.equal((await save(token, "grinder", [run()])).error, "full");
  assert.deepEqual(
    (await save(token, "grinder", [{ ...kept, excluded: true }])).replaced,
    [],
    "a full account can still leave runs out",
  );
  await db.exec("delete from zetamath.accounts where username = 'grinder'");

  await db.exec("update zetamath.sign_ups set at = at - interval '2 hours'");
  const before = Number(await one("select count(*) from zetamath.sign_ups"));
  for (let i = 0; i < 20; i++) assert.ok((await signUp(`crowd_${i}`, "password1")).token);
  assert.equal((await signUp("one_more", "password1")).error, "busy");
  assert.equal((await signUp("friend", "password1")).error, "taken");
  const gone = await logIn("crowd_0", "password1");
  assert.ok(
    (await call("delete_account", { p_token: gone.token, p_username: "crowd_0", p_password: "password1" })).ok,
  );
  assert.equal((await signUp("one_more", "password1")).error, "busy", "deleting makes no room");
  await db.exec("update zetamath.sign_ups set at = at - interval '2 hours'");
  for (let i = 20; i < 60 - before; i++) {
    if (i === 40) await db.exec("update zetamath.sign_ups set at = at - interval '2 hours'");
    assert.ok((await signUp(`crowd_${i}`, "password1")).token, `sign-up ${i}`);
  }
  await db.exec("update zetamath.sign_ups set at = at - interval '2 hours'");
  assert.equal((await signUp("one_more", "password1")).error, "busy", "sixty a day");
  await db.exec("update zetamath.sign_ups set at = at - interval '1 day'");
  assert.ok((await signUp("one_more", "password1")).token);
});

// Google's ids for people, as a checked ID token's "sub" gives them.
const GOOGLER = "104729000000000000001";
const FRIEND_GOOGLE = "104729000000000000002";
const googler = { username: "googler", owner: false, password: false, google: true };

await test("google signs up once, then logs in", async () => {
  await db.exec("delete from zetamath.sign_ups");
  assert.deepEqual(await googleEnter(GOOGLER), { account: null }, "no account yet: ask for a name");
  assert.equal(await one("select count(*)::int from zetamath.sign_ups"), 0, "and asking makes nothing");
  const made = await googleEnter(GOOGLER, "googler");
  assert.match(made.token, /^[0-9a-f]{64}$/);
  assert.deepEqual(made.account, googler);
  assert.deepEqual((await read(made.token)).account, googler);
  assert.equal(await one("select count(*)::int from zetamath.sign_ups"), 1);

  // From then on it logs in, whatever name comes with it.
  const again = await googleEnter(GOOGLER, "someone_else");
  assert.notEqual(again.token, made.token);
  assert.deepEqual(again.account, googler);
  assert.deepEqual((await googleEnter(GOOGLER)).account, googler);
  assert.equal(await one("select count(*)::int from zetamath.accounts where username = 'someone_else'"), 0);
  assert.equal(await one("select count(*)::int from zetamath.sign_ups"), 1);

  // No password gets in, and trying counts for nothing.
  for (const p of ["", "password1", null]) assert.equal((await logIn("googler", p)).error, "wrong");
  assert.equal(
    await one(`select count(*)::int from zetamath.attempts t join zetamath.accounts a
      on a.id = t.account_id where a.username = 'googler'`),
    0,
  );
  const change = await call("change_password", {
    p_token: made.token, p_username: "googler", p_current: "", p_next: "password1",
  });
  assert.equal(change.error, "wrong");

  // Only a hash of Google's id is kept.
  const dump = JSON.stringify(
    (await db.query("select username, encode(google_hash, 'escape') e from zetamath.accounts")).rows,
  );
  assert.ok(dump.includes("googler") && !dump.includes(GOOGLER));
});

await test("google sign-ups keep the rules for names, and the limits", async () => {
  const other = "104729000000000000003";
  for (const bad of ["ab", "a".repeat(21), "Friend", "a b c", "frïend", ""]) {
    assert.equal((await googleEnter(other, bad)).error, "bad_username", bad);
  }
  for (const name of ["friend", "googler", "brendan"]) {
    assert.equal((await googleEnter(other, name)).error, "taken", name);
  }
  for (const bad of ["", "a b", "x".repeat(256), "ïd", "1\n", null]) {
    assert.equal((await googleEnter(bad, "fine_name")).error, "bad_google", String(bad));
  }
  assert.equal(await one("select count(*)::int from zetamath.accounts where username = 'fine_name'"), 0);

  // The same twenty an hour as every other sign-up, counted together.
  await db.exec(`delete from zetamath.sign_ups;
    insert into zetamath.sign_ups (at) select now() from generate_series(1, 20)`);
  assert.equal((await googleEnter(other, "late_comer")).error, "busy");
  assert.equal((await signUp("late_comer", "password1")).error, "busy");
  await db.exec("update zetamath.sign_ups set at = at - interval '2 hours'");
  assert.ok((await googleEnter(other, "late_comer")).token);
  assert.equal(await one("select count(*)::int from zetamath.sign_ups where at > now() - interval '1 hour'"), 1);
});

await test("linking google needs the password, and one google account each", async () => {
  const { token } = await logIn("friend", "password2");
  assert.equal((await googleLink(null, "friend", "password2", FRIEND_GOOGLE)).error, "not_logged_in");
  assert.equal((await googleLink(token, "other_one", "password2", FRIEND_GOOGLE)).error, "other_account");
  assert.equal((await googleLink(token, "friend", "password2", "")).error, "bad_google");
  assert.equal((await googleLink(token, "friend", "nope", FRIEND_GOOGLE)).error, "wrong");
  assert.equal((await googleLink(token, "friend", "password2", GOOGLER)).error, "google_taken");
  assert.deepEqual(await googleEnter(FRIEND_GOOGLE), { account: null }, "nothing linked yet");

  const linked = await googleLink(token, "friend", "password2", FRIEND_GOOGLE);
  const both = { username: "friend", owner: false, password: true, google: true };
  assert.deepEqual(linked.account, both);
  assert.deepEqual((await read(token)).account, both);
  assert.equal((await googleLink(token, "friend", "password2", "104729000000000000004")).error, "linked");

  // Both ways in work now, to the same account.
  assert.deepEqual((await googleEnter(FRIEND_GOOGLE, "not_friend")).account, both);
  assert.ok((await logIn("friend", "password2")).token);

  // Wrong passwords here count like any others.
  const { token: mine } = await signUp("linker", "password1");
  for (let i = 0; i < 10; i++) {
    assert.equal((await googleLink(mine, "linker", `guess ${i}`, "104729000000000000005")).error, "wrong");
  }
  assert.equal((await googleLink(mine, "linker", "password1", "104729000000000000005")).error, "slow_down");
  assert.equal((await logIn("linker", "password1")).error, "slow_down");
});

await test("unlinking google needs the password, and logs out everywhere else", async () => {
  const here = await logIn("friend", "password2");
  const viaGoogle = await googleEnter(FRIEND_GOOGLE);
  const bystander = await logIn("other_one", "password1");
  assert.equal((await googleUnlink(null, "friend", "password2")).error, "not_logged_in");
  assert.equal((await googleUnlink(here.token, "other_one", "password2")).error, "other_account");
  assert.equal((await googleUnlink(here.token, "friend", "nope")).error, "wrong");
  assert.deepEqual((await googleUnlink(here.token, "friend", "password2")).account, passwordAccount("friend"));
  assert.ok((await read(here.token)).account);
  assert.equal((await read(viaGoogle.token)).account, null, "the browser that came in through google is out");
  assert.ok((await read(bystander.token)).account, "and nobody else's");
  assert.deepEqual(await googleEnter(FRIEND_GOOGLE), { account: null }, "google can't get back in");

  // With no password, google is the only way in, so it stays.
  const g = await googleEnter(GOOGLER);
  assert.equal((await googleUnlink(g.token, "googler", "")).error, "no_password");
  assert.deepEqual((await read(g.token)).account, googler);
});

await test("an account made with google is deleted with google", async () => {
  const sub = "104729000000000000006";
  const g = await googleEnter(sub, "short_lived");
  await save(g.token, "short_lived", [run()]);
  const del = googleDelete;
  assert.equal(
    (await call("delete_account", { p_token: g.token, p_username: "short_lived", p_password: "" })).error,
    "wrong",
  );
  assert.equal((await del(null, "short_lived", sub)).error, "not_logged_in");
  assert.equal((await del(g.token, "googler", sub)).error, "other_account");
  assert.equal((await del(g.token, "short_lived", GOOGLER)).error, "other_google");
  assert.equal((await del(g.token, "short_lived", null)).error, "other_google");
  // One with a password is deleted with that, even with Google linked: logging in
  // with Google is not enough.
  const f = await logIn("friend", "password2");
  assert.equal((await del(f.token, "friend", FRIEND_GOOGLE)).error, "has_password");
  assert.ok((await googleLink(f.token, "friend", "password2", FRIEND_GOOGLE)).account?.google);
  assert.equal((await del((await googleEnter(FRIEND_GOOGLE)).token, "friend", FRIEND_GOOGLE)).error, "has_password");
  assert.ok((await read(f.token)).account);
  assert.ok((await googleUnlink(f.token, "friend", "password2")).account);

  assert.equal((await del(g.token, "short_lived", sub)).ok, true);
  assert.equal((await read(g.token)).account, null);
  assert.equal(await one("select count(*)::int from zetamath.accounts where username = 'short_lived'"), 0);
  assert.deepEqual(await googleEnter(sub), { account: null }, "the google account is free again");

  // Nor the owner, this way or any other.
  const owner = await logIn("blo", "a new one");
  assert.ok((await googleLink(owner.token, "blo", "a new one", "104729000000000000007")).account?.google);
  assert.equal((await del(owner.token, "blo", "104729000000000000007")).error, "owner");
});

await test("the SQL editor can give a google account a password", async () => {
  assert.equal(await one("select zetamath.set_password('googler', 'given one')"), true);
  const { token } = await logIn("googler", "given one");
  assert.deepEqual((await read(token)).account, { ...googler, password: true });
  // A password bcrypt would cut short, or none, is refused, and changes nothing.
  await assert.rejects(one(`select zetamath.set_password('googler', '${"x".repeat(73)}')`));
  await assert.rejects(one("select zetamath.set_password('googler', null)"));
  assert.ok((await logIn("googler", "given one")).token);
  // Every account keeps a way in.
  await assert.rejects(
    db.exec("update zetamath.accounts set password_hash = null where username = 'friend'"),
    /accounts_a_way_in/,
  );
});

await test("a full disk stops everyone but the owner", async () => {
  await db.exec(`create or replace function zetamath.runs_limit() returns bigint
    language sql immutable set search_path = '' as 'select 0::bigint'`);
  const friend = await logIn("friend", "password2");
  assert.equal((await save(friend.token, "friend", [run()])).error, "slow_down");
  const [first] = (await read(friend.token)).runs;
  assert.deepEqual((await save(friend.token, "friend", [{ ...first, excluded: true }])).replaced, []);
  assert.equal((await read(friend.token)).runs[0].excluded, true);
  const owner = await logIn("blo", "a new one");
  assert.equal((await save(owner.token, "blo", [run()])).error, undefined);
});

await test("a stranger can reach nothing else", async () => {
  const asAnon = (sql: string, role = "anon") =>
    db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      return tx.query(sql);
    });
  for (const role of ["anon", "authenticated"]) {
    for (const table of ["accounts", "sessions", "sign_ups", "attempts", "runs", "heartbeat"]) {
      await assert.rejects(asAnon(`select * from zetamath.${table}`, role), /permission denied/);
      await assert.rejects(asAnon(`delete from zetamath.${table}`, role), /permission denied/);
    }
    for (const fn of [
      "set_password('blo', 'x')", "account_for('x')", "check_password(gen_random_uuid(), 'x')",
      "start_session(gen_random_uuid())", "runs_of(gen_random_uuid())", "hash_password('x')",
      "runs_limit()", "answers_limit()", "account_json(null)", "claim_username('x')",
      "google_allowed('x')",
    ]) {
      await assert.rejects(asAnon(`select zetamath.${fn}`, role), /permission denied/);
    }
    // Each of these believes the Google id it is given, so only the server may.
    for (const fn of [
      `google_enter('${GOOGLER}')`, `google_enter('104729000000000000099', 'intruder')`,
      `google_link(null, 'friend', 'x', '${GOOGLER}')`, `google_delete(null, 'googler', '${GOOGLER}')`,
    ]) {
      await assert.rejects(asAnon(`select public.zetamath_${fn}`, role), /permission denied/);
    }
    await assert.rejects(asAnon("create table zetamath.x (a int)", role), /permission denied/);
  }
  await assert.rejects(asAnon("select public.zetamath_read()", "authenticated"), /permission denied/);
  await assert.rejects(
    asAnon("select public.zetamath_answers(null, '2026-11-25', '2026-11-25')", "authenticated"),
    /permission denied/,
  );
  // Nor anyone else: no function here is left open to every role.
  assert.equal(
    await one(`select count(*)::int from pg_proc p where p.proname like 'zetamath\\_%' and (p.proacl is null
      or exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 or a.grantee = 'authenticated'::regrole))`),
    0,
  );
  const open = await db.query<{ proname: string }>(
    `select proname from pg_proc where pronamespace = 'public'::regnamespace
     and has_function_privilege('anon', oid, 'execute') order by 1`,
  );
  assert.deepEqual(
    open.rows.map((r) => r.proname).filter((n) => n.startsWith("zetamath")),
    [
      "answers", "change_password", "delete_account", "google_unlink", "keep_awake", "log_in", "log_out",
      "read", "save", "sign_up",
    ].map((n) => `zetamath_${n}`),
  );
  const serverOnly = await db.query<{ proname: string }>(
    `select proname from pg_proc where pronamespace = 'public'::regnamespace
     and has_function_privilege('service_role', oid, 'execute')
     and not has_function_privilege('anon', oid, 'execute') order by 1`,
  );
  assert.deepEqual(
    serverOnly.rows.map((r) => r.proname).filter((n) => n.startsWith("zetamath")),
    ["google_delete", "google_enter", "google_link"].map((n) => `zetamath_${n}`),
  );
  // Every function pins its search_path, so nothing can be shadowed.
  assert.equal(
    await one(`select count(*)::int from pg_proc p where
      (p.pronamespace = 'zetamath'::regnamespace or p.proname like 'zetamath\\_%')
      and (p.proconfig is null or not 'search_path=""' = any (p.proconfig))`),
    0,
  );
});

await test("keep awake", async () => {
  await call("keep_awake");
  await call("keep_awake");
  assert.equal(await one("select count(*)::int from zetamath.heartbeat"), 1);
});

console.log(`${count} database tests passed.`);
await db.close();
