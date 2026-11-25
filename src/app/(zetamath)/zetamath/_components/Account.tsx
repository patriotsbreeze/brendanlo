"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Run } from "../_lib/runs";
import { useRuns } from "./RunsProvider";

type Mode = "log in" | "sign up";

/** Log in or sign up, on the account tab or under a finished run. */
export function EnterForm({ save }: { save?: Run }) {
  const { enter } = useRuns();
  const [mode, setMode] = useState<Mode>("log in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const id = useId();
  const signUp = mode === "sign up";

  return (
    <form
      className="fields"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const problem = await enter(mode, username, password, save);
        // On success the parent stops rendering this form.
        setBusy(false);
        setError(problem);
        if (!problem) return;
        if (!signUp) setPassword("");
        field.current?.focus();
      }}
    >
      <label htmlFor={`${id}-u`}>username</label>
      <input
        id={`${id}-u`}
        type="text"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={20}
        required
        autoFocus={save !== undefined}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <label htmlFor={`${id}-p`}>password</label>
      <input
        ref={field}
        id={`${id}-p`}
        type="password"
        name="password"
        autoComplete={signUp ? "new-password" : "current-password"}
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-describedby={signUp ? `${id}-rules` : undefined}
      />
      {signUp && (
        <p className="note wide" id={`${id}-rules`}>
          at least 8 characters. there&rsquo;s no email, so a forgotten password can&rsquo;t be
          reset by itself.
        </p>
      )}
      {error && (
        <p className="problemNote wide" role="alert">
          {error}
        </p>
      )}
      <div className="startRow wide">
        <button type="submit" className="button small" disabled={busy}>
          {mode}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(signUp ? "log in" : "sign up");
            setError(null);
          }}
        >
          {signUp ? "i have an account" : "make an account"}
        </button>
      </div>
    </form>
  );
}

/** Under a finished run that nobody is logged in to keep. */
export function KeepRun({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="note exclude">
        not recorded.{" "}
        <button type="button" className="link" onClick={() => setOpen(true)}>
          log in or sign up to save it
        </button>
      </div>
    );
  }
  return (
    <div className="exclude keep">
      <EnterForm save={run} />
    </div>
  );
}

/** The account tab. */
export function AccountPage() {
  const { status, account, runs, waiting, logOut } = useRuns();
  const [problem, setProblem] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const name = account?.username ?? null;
  const shown = useRef<string | null | undefined>(undefined);

  // The form that logged you in or out is gone, so say where you are now.
  useEffect(() => {
    if (status === "loading") return;
    if (shown.current !== undefined && shown.current !== name) heading.current?.focus();
    shown.current = name;
  }, [status, name]);

  if (status === "loading") return <p className="lede holding">loading…</p>;

  if (!account) {
    return (
      <div className="holding">
        <h1 ref={heading} tabIndex={-1}>
          log in or sign up.
        </h1>
        <p className="lede">
          an account keeps your runs and draws your own graphs, which nobody else can open. you can
          play without one.
        </p>
        <EnterForm />
      </div>
    );
  }

  const recorded = runs.length - (waiting[account.username] ?? 0);
  return (
    <div className="holding">
      <h1 ref={heading} tabIndex={-1}>
        {account.username}
      </h1>
      <p className="lede">
        {status === "error"
          ? "couldn't load your runs. reload to try again. "
          : `${count(Math.max(0, recorded))} recorded. `}
        {account.owner ? "anyone can see your graphs." : "nobody else can open your graphs."}
      </p>
      <div className="startRow accountRow">
        <button
          type="button"
          className="button small"
          onClick={async () => setProblem(await logOut())}
        >
          log out
        </button>
        {problem && (
          <p className="problemNote" role="alert">
            {problem}
          </p>
        )}
      </div>
      <ChangePassword key={`c ${account.username}`} username={account.username} />
      {!account.owner && <DeleteAccount key={`d ${account.username}`} />}
    </div>
  );
}

function ChangePassword({ username }: { username: string }) {
  const { changePassword } = useRuns();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; words: string } | null>(null);
  const id = useId();
  return (
    <section className="accountPart">
      <h2>change password</h2>
      <form
        className="fields"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const problem = await changePassword(current, next);
          setBusy(false);
          setSaid(
            problem
              ? { ok: false, words: problem }
              : { ok: true, words: "changed. every other browser is logged out." },
          );
          if (!problem) {
            setCurrent("");
            setNext("");
          }
        }}
      >
        {/* So a password manager knows which login this is. */}
        <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
        <label htmlFor={`${id}-c`}>current</label>
        <input
          id={`${id}-c`}
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <label htmlFor={`${id}-n`}>new</label>
        <input
          id={`${id}-n`}
          type="password"
          autoComplete="new-password"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-describedby={`${id}-r`}
        />
        <p className="note wide" id={`${id}-r`}>
          at least 8 characters.
        </p>
        {said && (
          <p className={said.ok ? "note wide" : "problemNote wide"} role={said.ok ? "status" : "alert"}>
            {said.words}
          </p>
        )}
        <div className="wide">
          <button type="submit" className="button small" disabled={busy}>
            change password
          </button>
        </div>
      </form>
    </section>
  );
}

function DeleteAccount() {
  const { deleteAccount } = useRuns();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const id = useId();
  return (
    <section className="accountPart">
      <h2>delete account</h2>
      {!open ? (
        <button type="button" className="link" onClick={() => setOpen(true)}>
          delete this account
        </button>
      ) : (
        <form
          className="fields"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const said = await deleteAccount(password);
            setBusy(false);
            setProblem(said);
            setPassword("");
          }}
        >
          <p className="wide">
            this deletes the account and every run in it for good. nobody can bring them back.
          </p>
          <label htmlFor={`${id}-d`}>password</label>
          <input
            id={`${id}-d`}
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {problem && (
            <p className="problemNote wide" role="alert">
              {problem}
            </p>
          )}
          <div className="startRow wide">
            <button type="submit" className="button small danger" disabled={busy}>
              delete for good
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setProblem(null);
              }}
            >
              keep it
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

const SYNC_NOTE = {
  idle: null,
  saving: null,
  offline: "couldn't save yet, will retry",
  full: "this account has all the runs it can hold",
} as const;

const count = (n: number) => (n === 1 ? "1 run" : `${n} runs`);

/** Footer line: who is playing, and whether their runs are safe. */
export function AccountLine() {
  const { account, status, sync, waiting, logOut } = useRuns();
  const [problem, setProblem] = useState<string | null>(null);
  if (status === "loading") return <div>&nbsp;</div>;
  const others = Object.entries(waiting).filter(([name, n]) => n > 0 && name !== account?.username);
  const own = account ? (waiting[account.username] ?? 0) : 0;
  return (
    <div className="accountLine">
      {account ? (
        <span>
          logged in as <Link href="/zetamath/account">{account.username}</Link>, runs are recorded.{" "}
          <button type="button" className="link" onClick={async () => setProblem(await logOut())}>
            log out
          </button>
          {problem && (
            <span className="problemNote" role="alert">
              {" "}
              {problem}
            </span>
          )}
        </span>
      ) : (
        <Link href="/zetamath/account">log in or sign up</Link>
      )}
      {own > 0 && SYNC_NOTE[sync] && (
        <span className="note" role="status">
          {" "}
          {SYNC_NOTE[sync]}. {count(own)} kept in this browser.
        </span>
      )}
      {others.map(([name, n]) => (
        <span className="note" key={name}>
          {" "}
          {count(n)} here will be saved when {name} logs in.
        </span>
      ))}
    </div>
  );
}
