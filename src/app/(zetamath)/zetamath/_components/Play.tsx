"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { settingsStore } from "../_lib/browser";
import {
  describeKey,
  makeProblem,
  settingsError,
  settingsKey,
  STANDARD,
  STANDARD_KEY,
  type Problem,
  type Settings,
} from "../_lib/problems";
import { dayKey, opTotals, type Solved } from "../_lib/runs";
import { Game } from "./Game";
import { Result } from "./Result";
import { useRuns } from "./RunsProvider";
import { SettingsForm } from "./SettingsForm";

type Round = { settings: Settings; first: Problem; startedAt: number };

export function Play() {
  const settings = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.get,
    settingsStore.getServer,
  );
  const { result, finish, clearResult } = useRuns();
  const [round, setRound] = useState<Round | null>(null);

  const start = useCallback((on: Settings) => {
    setRound({ settings: on, first: makeProblem(on), startedAt: performance.now() });
  }, []);

  const onFinish = useCallback(
    (solved: Solved[], played: Settings) => {
      const at = Date.now();
      finish({
        run: {
          id: crypto.randomUUID(),
          at,
          day: dayKey(at),
          offset: new Date(at).getTimezoneOffset(),
          score: solved.length,
          seconds: played.seconds,
          settings: settingsKey(played),
          ops: opTotals(solved),
          excluded: false,
        },
        solved,
      });
      setRound(null);
    },
    [finish],
  );

  // A round in progress is lost if the tab closes, so ask first.
  useEffect(() => {
    if (!round) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [round]);

  if (round) {
    return (
      <Game
        key={round.startedAt}
        settings={round.settings}
        first={round.first}
        startedAt={round.startedAt}
        onFinish={onFinish}
        onQuit={() => setRound(null)}
      />
    );
  }

  if (result) {
    return <Result result={result} onAgain={() => start(settings)} onSettings={clearResult} />;
  }

  return <Setup settings={settings} onStart={() => start(settings)} />;
}

function Setup({ settings, onStart }: { settings: Settings; onStart: () => void }) {
  const error = settingsError(settings);
  const standard = !error && settingsKey(settings) === STANDARD_KEY;
  return (
    <form
      className="setup"
      onSubmit={(e) => {
        e.preventDefault();
        if (!error) onStart();
      }}
    >
      <h1>answer as many as you can before the time runs out.</h1>
      <p className="lede">
        type the answer. it moves on by itself the moment you&rsquo;re right, no enter. esc quits.
      </p>
      <SettingsForm settings={settings} onChange={settingsStore.set} />
      <div className="startRow">
        <button type="submit" className="button" disabled={Boolean(error)} autoFocus>
          start
        </button>
        {error ? (
          <p role="alert" className="note">
            {error}
          </p>
        ) : standard ? (
          <p className="note">standard settings</p>
        ) : (
          <p className="note">
            {describeKey(settingsKey(settings))}, graphed on its own.{" "}
            <button type="button" className="link" onClick={() => settingsStore.set(STANDARD)}>
              back to standard
            </button>
          </p>
        )}
      </div>
    </form>
  );
}
