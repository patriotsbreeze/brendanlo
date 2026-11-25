"use client";

import { useEffect, useRef, useState } from "react";
import { show, type Problem } from "../_lib/problems";
import { exampleProblem, sample, TRICKS, type Trick } from "../_lib/tricks";

/** Tricks hold functions, so the server passes an id and this looks it up. */
export function TrickWork({ id }: { id: string }) {
  const trick = TRICKS.find((t) => t.id === id) as Trick;
  const [problem, setProblem] = useState<Problem>(() => exampleProblem(trick));
  const [drilling, setDrilling] = useState(false);

  if (drilling) return <Drill trick={trick} onDone={() => setDrilling(false)} />;

  return (
    <div className="work">
      <Steps trick={trick} problem={problem} />
      <p className="workActions">
        <button type="button" className="link" onClick={() => setProblem(sample(trick, problem))}>
          another
        </button>
        <button type="button" className="link" onClick={() => setDrilling(true)}>
          drill it
        </button>
      </p>
    </div>
  );
}

function Steps({ trick, problem }: { trick: Trick; problem: Problem }) {
  return (
    <>
      <p className="workProblem">
        {show(problem)} = <b>{problem.answer}</b>
      </p>
      <ol className="steps">
        {trick.work(problem).steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </>
  );
}

/** Untimed and unrecorded: one kind of problem, over and over. */
function Drill({ trick, onDone }: { trick: Trick; onDone: () => void }) {
  const [problem, setProblem] = useState<Problem>(() => exampleProblem(trick));
  const [entry, setEntry] = useState("");
  const [right, setRight] = useState(0);
  const [shown, setShown] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus({ preventScroll: true }), []);

  return (
    <div className="work">
      {shown ? (
        <Steps trick={trick} problem={problem} />
      ) : (
        <p className="workProblem">{show(problem)}</p>
      )}
      <input
        ref={input}
        className="drillAnswer"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={`answer to ${show(problem)}`}
        value={entry}
        onChange={(e) => {
          const text = e.target.value.replace(/\D/g, "");
          if (text !== String(problem.answer)) {
            setEntry(text);
            return;
          }
          setEntry("");
          setRight((n) => n + (shown ? 0 : 1));
          setShown(false);
          setProblem(sample(trick, problem));
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
      />
      <p className="workActions">
        <span className="note" role="status">
          {right} right
        </span>
        <button
          type="button"
          className="link"
          onClick={() => {
            setShown(true);
            input.current?.focus();
          }}
        >
          show me
        </button>
        <button type="button" className="link" onClick={onDone}>
          done
        </button>
      </p>
    </div>
  );
}
