import type { Metadata } from "next";
import { TrickWork } from "../_components/TrickCard";
import { OP_NAME, OPS, STANDARD, type Op } from "../_lib/problems";
import { coverage, TRICKS, type Trick } from "../_lib/tricks";

export const metadata: Metadata = {
  title: "tricks",
  description:
    "mental math tricks for two-minute arithmetic drills: × 11, × 12, dividing by the last digit, subtracting through 100, and more. each with worked examples and a drill.",
  alternates: { canonical: "/zetamath/tricks" },
};

/* Figures on this page are counted from the standard settings, so they stay
 * true if STANDARD changes. Rendered once, at build time. */

const percent = (x: number) => (x < 0.01 ? "under 1%" : `${Math.round(x * 100)}%`);

const through100 = coverage(TRICKS.find((t) => t.id === "sub-through-100") as Trick);
const factors = STANDARD.mul[0][1] - STANDARD.mul[0][0] + 1;
const perFactor = (50 * 0.5) / factors;

const lastDigits = [3, 7, 9].map((n) => ({
  n,
  ones: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (last) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => (n * d) % 10 === last) as number,
  ),
}));

const PACE = [40, 50, 60, 70, 80];

const SECTION_NOTE: Record<Op, string> = {
  add: "two numbers from 2 to 100. the second method lets you type from the left while you are still thinking.",
  sub: "a sum run backwards, so the answer is always between 2 and 100.",
  mul: `the first number is always 2 to 12 and the second is 2 to 100. learn one move for each of 2 to 12 and you have covered every multiplication. the first eight below are the moves for 4 to 9, 11 and 12 (2, 3 and 10 you already have). the rest depend on the second number, or fit anything.`,
  div: "a product run backwards. the divisor is always 2 to 12, the answer is always a whole number from 2 to 100, and there is never a remainder. so never do long division: pin down the tens, then pin down the ones.",
};

export default function Page() {
  return (
    <div className="tricks">
      <h1>tricks</h1>
      <p className="lede">
        every one is for a problem this game really asks. the percentages are how often it comes
        up, counted over every problem the standard settings can make.
      </p>
      <nav className="jump" aria-label="sections">
        <a href="#first">start here</a>
        {OPS.map((op) => (
          <a key={op} href={`#${op}`}>
            {OP_NAME[op]}
          </a>
        ))}
        <a href="#tables">tables</a>
        <a href="#habits">habits</a>
      </nav>

      <section id="first">
        <h2>start here</h2>
        <p>if you only learn a few things, start with these:</p>
        <ul>
          <li>
            <a href="#sub-through-100">go through 100</a> when a subtraction starts above 100 and
            the ones would borrow. that is {percent(through100)} of subtractions.
          </li>
          <li>
            <a href="#div-last-digit">read the last digit</a> when dividing by 3, 7 or 9. no
            division happens at all.
          </li>
          <li>
            <a href="#mul-11">× 11</a> and <a href="#mul-12">× 12</a>, then{" "}
            <a href="#div-11">÷ 11</a> (the same trick backwards) and{" "}
            <a href="#div-12">÷ 12</a>. they look like the hardest tables and are two of the easiest.
          </li>
          <li>
            <a href="#add-peek">peek, then write</a>. work from the left so your fingers start
            before your head finishes.
          </li>
        </ul>
        <p>
          half of all problems are multiplication or division, and each of those has one factor
          from 2 to 12. in a 50-answer run you will meet each factor about {perFactor.toFixed(1)}{" "}
          times, so one table you are slow at costs you every single run.
        </p>
      </section>

      {OPS.map((op) => (
        <section key={op} id={op}>
          <h2>{OP_NAME[op]}</h2>
          <p>{SECTION_NOTE[op]}</p>
          {TRICKS.filter((t) => t.op === op).map((t) => (
            <article key={t.id} id={t.id} className="trick">
              <div>
                <h3>{t.title}</h3>
                <p>{t.idea}</p>
                <p className="note">
                  {percent(coverage(t))} of {OP_NAME[op]}s
                </p>
              </div>
              <TrickWork id={t.id} />
            </article>
          ))}
        </section>
      ))}

      <section id="tables">
        <h2>tables worth memorizing</h2>
        <h3>ones digit of the answer, from the last digit of the question</h3>
        <div className="scroll">
          <table className="rows digits">
            <thead>
              <tr>
                <th scope="row">ends in</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lastDigits.map(({ n, ones }) => (
                <tr key={n}>
                  <th scope="row">÷ {n}</th>
                  {ones.map((o, i) => (
                    <td key={i}>{o}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          ÷ 3 and ÷ 7 are the same list read in opposite directions. ÷ 9 is 10 minus the digit.
        </p>
        <h3>the tables past ten</h3>
        <div className="scroll">
          <table className="rows digits">
            <thead>
              <tr>
                <th scope="row"></th>
                {[2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
                {[11, 12].map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[11, 12, 13, 14, 15].map((n) => (
                <tr key={n}>
                  <th scope="row">× {n}</th>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 11, 12].map((d) => (
                    <td key={d}>{n * d}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="habits">
        <h2>habits</h2>
        <ul>
          <li>
            type each digit as soon as it can no longer change. a three-digit answer is mostly
            typing.
          </li>
          <li>
            don&rsquo;t check. the box moves on when you&rsquo;re right, so the game checks for
            you. if it doesn&rsquo;t move, assume a typo first: clear it (⌥ or ctrl + backspace
            takes the whole number) and retype before you recalculate.
          </li>
          <li>
            use a number pad if you have one, without looking.{" "}
            <a href="https://quantvault.org/zetamac-practice.html" rel="noopener noreferrer">
              prep guides
            </a>{" "}
            say the same. keep one setup for every run, or your graph is measuring keyboards.
          </li>
          <li>
            get accurate first. a wrong first try costs more than a slow right one, because you
            pay for it twice.
          </li>
          <li>
            a few runs every day beats an hour on sunday. speed here is recall, and recall
            sticks when it is{" "}
            <a href="https://quantvault.org/quant-mental-math-practice.html" rel="noopener noreferrer">
              spaced out
            </a>
            .
          </li>
          <li>
            after each run, look at the slowest five. if the same operation keeps showing up,
            turn the other three off in settings and play only that for a few minutes. those
            runs are graphed separately.
          </li>
          <li>
            drill a trick until it is faster than what you do now before using it in a real run.
            for the first few days it will be slower.
          </li>
        </ul>
        <h3>what a score means</h3>
        <div className="scroll">
          <table className="rows digits">
            <thead>
              <tr>
                <th scope="row">score in {STANDARD.seconds} s</th>
                {PACE.map((s) => (
                  <th key={s} scope="col">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">seconds each</th>
                {PACE.map((s) => (
                  <td key={s}>{(STANDARD.seconds / s).toFixed(2)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="note">
          <a href="https://quantvault.org/zetamac-practice.html" rel="noopener noreferrer">
            one prep guide
          </a>{" "}
          calls 45 to 55 a workable baseline for trading interviews, 55 to 70 competitive, and
          70+ never the reason you get cut. treat that as folklore: firms don&rsquo;t publish
          cutoffs.
        </p>
      </section>
    </div>
  );
}
