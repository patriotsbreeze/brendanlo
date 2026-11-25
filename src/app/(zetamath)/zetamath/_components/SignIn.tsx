"use client";

import { useId, useState } from "react";
import { useRuns } from "./RunsProvider";

/** A quiet "log in" that opens into a password box. */
export function SignIn({ label = "log in" }: { label?: string }) {
  const { signIn } = useRuns();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  if (!open) {
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <form
      className="signIn"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const problem = await signIn(password);
        // On success the parent stops rendering this form.
        setBusy(false);
        setError(problem);
        setPassword("");
      }}
    >
      <label htmlFor={id}>password</label>
      <input
        id={id}
        type="password"
        autoComplete="current-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button type="submit" className="button small" disabled={busy || !password}>
        log in
      </button>
      {error && (
        <span id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

const SYNC_NOTE = {
  idle: null,
  saving: null,
  offline: "couldn't reach the database, will retry",
  "no-storage": "no database connected yet",
} as const;

/** Footer line: who is playing, and whether their runs are safe. */
export function OwnerLine() {
  const { owner, status, sync, waiting, signOut } = useRuns();
  if (status === "loading") return <div>&nbsp;</div>;
  const unsaved = waiting === 1 ? "1 run" : `${waiting} runs`;
  if (!owner) {
    return (
      <div>
        <SignIn />
        {waiting > 0 && <span className="note"> {unsaved} waiting in this browser</span>}
      </div>
    );
  }
  return (
    <div>
      logged in, runs are recorded.{" "}
      <button type="button" className="link" onClick={() => void signOut()}>
        log out
      </button>
      {waiting > 0 && SYNC_NOTE[sync] && (
        <span className="note" role="status">
          {" "}
          {SYNC_NOTE[sync]}. {unsaved} kept in this browser.
        </span>
      )}
    </div>
  );
}
