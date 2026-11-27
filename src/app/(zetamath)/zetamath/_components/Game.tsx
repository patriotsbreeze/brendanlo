"use client";

import { useEffect, useRef, useState } from "react";
import { makeProblem, show, type Problem, type Settings } from "../_lib/problems";
import type { Solved } from "../_lib/runs";
import { Tape } from "./Tape";

type Props = {
  settings: Settings;
  first: Problem;
  /** performance.now() when start was pressed. */
  startedAt: number;
  onFinish: (solved: Solved[], settings: Settings) => void;
  onQuit: () => void;
};

export function Game({ settings, first, startedAt, onFinish, onQuit }: Props) {
  const total = settings.seconds * 1000;
  const [problem, setProblem] = useState(first);
  const [entry, setEntry] = useState("");
  const [solved, setSolved] = useState<Solved[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<Solved[]>([]);
  const over = useRef(false);
  /** On the problem showing now: wrong turns so far, and whether the box is off
   * track at the moment, so that one wrong digit and its backspace count once. */
  const misses = useRef(0);
  const off = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (over.current) return;
      over.current = true;
      onFinish(log.current, settings);
    };
    const tick = () => {
      const now = performance.now() - startedAt;
      if (now >= total) finish();
      else setElapsed(now);
    };
    const interval = setInterval(tick, 100);
    const buzzer = setTimeout(finish, Math.max(0, total - (performance.now() - startedAt)));
    return () => {
      clearInterval(interval);
      clearTimeout(buzzer);
    };
  }, [onFinish, settings, startedAt, total]);

  // Keep the keys working even after a stray click outside the box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onQuit();
      else if (/^\d$/.test(e.key) && document.activeElement !== input.current) input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onQuit]);

  const onType = (raw: string) => {
    const text = raw.replace(/\D/g, "");
    const now = performance.now() - startedAt;
    const goal = String(problem.answer);
    if (now >= total || text !== goal) {
      const wrong = !goal.startsWith(text);
      if (wrong && !off.current && now < total) misses.current++;
      off.current = wrong;
      setEntry(text);
      return;
    }
    const at = log.current.at(-1)?.at ?? 0;
    log.current = [...log.current, { problem, ms: now - at, at: now, misses: misses.current }];
    misses.current = 0;
    off.current = false;
    setSolved(log.current);
    setProblem(makeProblem(settings, problem));
    setEntry("");
  };

  return (
    <section className="game" aria-label="game">
      <div className="status">
        <span>
          <b>{Math.max(0, Math.ceil((total - elapsed) / 1000))}</b> seconds
        </span>
        <span>
          <b>{solved.length}</b> solved
        </span>
      </div>
      <div className="question">
        <label htmlFor="answer" className="problem">
          {show(problem)}
          <span className="eq" aria-hidden="true">
            =
          </span>
        </label>
        <input
          ref={input}
          id="answer"
          className="answer"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoFocus
          value={entry}
          onChange={(e) => onType(e.target.value)}
        />
      </div>
      <Tape solved={solved} total={total} elapsed={elapsed} />
      <button type="button" className="link quit" onClick={onQuit}>
        quit
      </button>
    </section>
  );
}
