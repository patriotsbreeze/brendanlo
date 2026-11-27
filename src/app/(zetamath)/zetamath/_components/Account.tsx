"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cleanUsername, USERNAME, type Account } from "../_lib/accounts";
import type { GoogleProof } from "../_lib/google";
import type { Run } from "../_lib/runs";
import { emailIn, GoogleButton, googleOn } from "./Google";
import { useRuns } from "./RunsProvider";

type Mode = "log in" | "sign up";

/** Log in or sign up, on the account tab or under a finished run. */
export function EnterForm({ save }: { save?: Run }) {
  const { enter, enterGoogle } = useRuns();
  const [mode, setMode] = useState<Mode>("log in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Signed in with a Google account that has no account here yet. */
  const [newGoogle, setNewGoogle] = useState<GoogleProof | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const id = useId();
  const signUp = mode === "sign up";

  const withGoogle = async (google: GoogleProof, name?: string) => {
    setBusy(true);
    const said = await enterGoogle(google, name, save);
    // On success the parent stops rendering this form.
    setBusy(false);
    setError(said.problem);
    if (said.again) setNewGoogle(null);
    if (said.pick === undefined) return;
    // A name typed already beats one made from the email address.
    if (!USERNAME.test(cleanUsername(username))) setUsername(said.pick);
    setNewGoogle(google);
  };

  if (newGoogle) {
    return (
      <form
        className="fields"
        onSubmit={(e) => {
          e.preventDefault();
          void withGoogle(newGoogle, username);
        }}
      >
        <p className="wide">
          no account here uses {emailIn(newGoogle.credential) ?? "that google account"} yet. pick a
          username to make one.
        </p>
        <label htmlFor={`${id}-g`}>username</label>
        <input
          id={`${id}-g`}
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-describedby={`${id}-gn`}
        />
        <p className="note wide" id={`${id}-gn`}>
          3 to 20 letters, numbers or underscores. you&rsquo;ll log in with google, so there&rsquo;s
          no password. have an account already? log in to it, then link google on the account tab.
        </p>
        {error && (
          <p className="problemNote wide" role="alert">
            {error}
          </p>
        )}
        <div className="startRow wide">
          <button type="submit" className="button small" disabled={busy}>
            make account
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setNewGoogle(null);
              setError(null);
            }}
          >
            back
          </button>
        </div>
      </form>
    );
  }

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
      {googleOn && (
        <div className="startRow wide googleRow">
          <span className="note">or</span>
          <GoogleButton
            words={signUp ? "signup_with" : "signin_with"}
            onSignIn={(google) => void withGoogle(google)}
          />
        </div>
      )}
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
        nobody else can open your graphs.
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
      {account.password && <ChangePassword key={`c ${account.username}`} username={account.username} />}
      {(googleOn || account.google) && <GoogleLink key={`g ${account.username}`} account={account} />}
      {!account.owner && <DeleteAccount key={`d ${account.username}`} password={account.password} />}
    </div>
  );
}

/** Link a Google account, or unlink it. Both need the password. */
function GoogleLink({ account }: { account: Account }) {
  const { linkGoogle, unlinkGoogle } = useRuns();
  /** Pressed the button: now for the password. */
  const [google, setGoogle] = useState<GoogleProof | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; words: string } | null>(null);
  const id = useId();

  const reset = () => {
    setGoogle(null);
    setUnlinking(false);
    setPassword("");
  };

  const asking = google !== null || unlinking;
  return (
    <section className="accountPart">
      <h2>google</h2>
      {account.google ? (
        <p>
          a google account is linked, and can log in to this one.{" "}
          {!account.password
            ? "it's the only way in, since there's no password."
            : !unlinking && (
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setUnlinking(true);
                    setSaid(null);
                  }}
                >
                  unlink it
                </button>
              )}
        </p>
      ) : (
        !google && (
          <>
            <p>link a google account to log in with it too.</p>
            <GoogleButton
              words="continue_with"
              onSignIn={(next) => {
                setGoogle(next);
                setSaid(null);
              }}
            />
          </>
        )
      )}
      {asking && (
        <form
          className="fields"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const { problem, again } = google
              ? await linkGoogle(google, password)
              : { problem: await unlinkGoogle(password) };
            setBusy(false);
            setPassword("");
            if (!problem || again) reset();
            setSaid(
              problem
                ? { ok: false, words: problem }
                : { ok: true, words: google ? "linked." : "unlinked. every other browser is logged out." },
            );
          }}
        >
          <p className="wide">
            {google
              ? `to link ${emailIn(google.credential) ?? "that google account"}, type this account's password.`
              : "to unlink it, type this account's password. every other browser will be logged out."}
          </p>
          <input type="text" name="username" autoComplete="username" value={account.username} readOnly hidden />
          <label htmlFor={`${id}-p`}>password</label>
          <input
            id={`${id}-p`}
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {said && !said.ok && (
            <p className="problemNote wide" role="alert">
              {said.words}
            </p>
          )}
          <div className="startRow wide">
            <button type="submit" className="button small" disabled={busy}>
              {google ? "link" : "unlink"}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                reset();
                setSaid(null);
              }}
            >
              cancel
            </button>
          </div>
        </form>
      )}
      {said && (said.ok || !asking) && (
        <p className={said.ok ? "note" : "problemNote"} role={said.ok ? "status" : "alert"}>
          {said.words}
        </p>
      )}
    </section>
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

/** With the password, or for an account with none, the Google account linked. */
function DeleteAccount({ password: hasPassword }: { password: boolean }) {
  const { deleteAccount } = useRuns();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [google, setGoogle] = useState<GoogleProof | null>(null);
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
            if (!hasPassword && !google) return;
            setBusy(true);
            const said = await deleteAccount(google ?? password);
            setBusy(false);
            setProblem(said);
            setPassword("");
            setGoogle(null);
          }}
        >
          <p className="wide">
            this deletes the account and every run in it for good. nobody can bring them back.
          </p>
          {hasPassword ? (
            <>
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
            </>
          ) : google ? (
            <p className="wide">
              signed in as {emailIn(google.credential) ?? "the google account"}. delete for good?
            </p>
          ) : (
            <div className="wide">
              <p className="note">first, sign in with the google account linked to this one.</p>
              <GoogleButton words="continue_with" onSignIn={setGoogle} />
            </div>
          )}
          {problem && (
            <p className="problemNote wide" role="alert">
              {problem}
            </p>
          )}
          <div className="startRow wide">
            <button type="submit" className="button small danger" disabled={busy || (!hasPassword && !google)}>
              delete for good
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setGoogle(null);
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
