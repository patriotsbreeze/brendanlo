import Link from "next/link";
import { Bed } from "./_components/Bed.tsx";
import { HealthControls, IndexNav, KDial, MealControls, RuleWalk, Shortcuts, VideoFacade, type IndexRow } from "./_components/controls.tsx";
import { NIGHT_COMMITS } from "./_components/night.ts";
import { estimate } from "./_tensors/meal.ts";
import styles from "./page.module.css";

/* /experimental: the same person as "/", pressed into pins.
 * Everything a reader needs is server-rendered HTML in this file; the beds
 * and controls are client islands that enhance it. Copy is inline, as on the
 * home page. Lowercase is the voice, not a style rule. */

const INDEX: IndexRow[] = [
  { id: "healthar", href: "#healthar", name: "healthar", shape: "256×192 depth + a protocol" },
  { id: "sidewalk", href: "#sidewalk", name: "sidewalk", shape: "190 rules → block faces" },
  { id: "rlvr", href: "#rlvr", name: "rlvr audit", shape: "500 problems × k" },
  { id: "meal", href: "#meal", name: "lidar meal", shape: "49,152 depths" },
  { id: "resource", href: "#resource", name: "resource", shape: "41 commits, 2:41 pm → 11:20 am" },
];

const HERO_PREVIEW: Record<string, string> = {
  sidewalk: "previewing sidewalk: one rule resolved to block faces. leave the list to come back.",
  rlvr: "previewing the pass@k audit: 500 toy problems at k = 256. yellow ones only pass by luck.",
  meal: "previewing the lidar meal: a demo plate as a depth map.",
  resource: "previewing resource: the whole night. height is commits so far, 2:41 pm to 11:20 am.",
  swag: "1 t-shirt. free. this is why i go to hackathons. (esc puts it away)",
};

const KEY_COMMITS = [
  "Initial commit",
  "fixed gemini api not working",
  "removed auth0",
  "supabase update",
  "map fixes",
  "failed to current location; also 4amprojectbreakdown.md",
  "clamed fix?",
  "front page combined!",
  "update",
];

export default function ExperimentalPage() {
  const rice = estimate("rice");
  const keyCommits = KEY_COMMITS.map((m) => NIGHT_COMMITS.find((c) => c.message === m)).filter((c) => c !== undefined);

  return (
    <>
      <a className={styles.skip} href="#healthar">
        skip to the projects
      </a>
      <main className={styles.main}>
        <div className={styles.heroGrid}>
          <header className={styles.head}>
            <h1 className={styles.name}>brendan lo</h1>
            <p className={styles.lede} data-gv="">
              18, cs + math @ uchicago. i build ai things fast, mostly at hackathons, mostly for the free stuff. everything here
              has a model in it and something that doesn&apos;t take the model&apos;s word for it.
            </p>
            <p className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.swatch} data-dye="model" aria-hidden="true" />
                yellow: what a model said
              </span>
              <span className={styles.legendItem}>
                <span className={styles.swatch} data-dye="check" aria-hidden="true" />
                green: what something deterministic checked
              </span>
            </p>
          </header>

          <div className={styles.heroBed}>
            <Bed
              bed="healthar"
              label="healthar's depth map of a cpr manikin, with pose keypoints and the protocol rail."
              idle="a stand-in for what the phone sees: depth (256×192 on the phone), 8 pose keypoints from the model, the protocol rail along the front. press any pin to read it."
              previewIdle={HERO_PREVIEW}
            />
          </div>

          <div className={styles.indexArea}>
            <IndexNav rows={INDEX} />
            <p className={styles.hint}>point at a name to press it into the pins.</p>
          </div>

          <article id="healthar" className={styles.healthArticle} aria-labelledby="healthar-title">
            <h2 id="healthar-title" className={styles.title}>
              the model reports, the engine decides.
            </h2>
            <p className={styles.meta}>
              <strong>healthar</strong> · a hackathon, nov 2026 · 3 days · 97 commits · team project
            </p>
            <p data-gv="">
              a phone app that talks a bystander through a cardiac arrest, a possible heart attack, or a possible broken bone,
              with voice, the camera, and ar, then hands a report to ems. gemini live hears and sees. a deterministic protocol on
              the phone owns every required step and keeps working with no network.
            </p>
            <p data-gv="">
              on a phone with scene depth, ar fits a manikin mesh to the patient&apos;s measured shoulders and hips. the bed is a
              stand-in for that depth, downsampled: a synthetic manikin, noisy, with pixels dropped at the edges, then 8
              keypoints from the pose model, then the fit.
            </p>
            <p data-gv="">
              gemini can raise urgency. it can never lower it, and it can&apos;t confirm a step only a person can confirm. the
              states and urgencies below are the real ones from the app&apos;s arrest protocol.
            </p>
            <HealthControls />
            <p className={styles.small} data-gv="">
              it&apos;s a simulation: it can&apos;t call 911 and nothing in it is clinically validated.{" "}
              <a href="https://github.com/patriotsbreeze/HealthAR">the repo</a>.
            </p>
          </article>
        </div>

        <section id="sidewalk" className={styles.project} data-side="right" aria-labelledby="sidewalk-title">
          <div className={styles.stage}>
            <Bed
              bed="sidewalk"
              label="a schematic midtown street grid. resolved block faces are raised green."
              idle="green faces are where the rule applies. press a pin to read a street or a face."
            />
          </div>
          <div className={styles.copy}>
            <h2 id="sidewalk-title" className={styles.title}>
              nyc publishes its street-vending rules as a 190-entry pdf. we turned each one into block faces.
            </h2>
            <p className={styles.meta}>
              <strong>sidewalk</strong> · 2nd place, nyc hackathon (shopify × base44) · aug 2026
            </p>
            <p data-gv="">
              you can&apos;t query a pdf, and you really can&apos;t query one on a street corner with no signal. a deno/ts etl reads
              each restriction, finds its endpoints on the city&apos;s street centerline graph, and walks the graph breadth-first
              until every block face the rule covers is resolved. it ships as an offline-first react/leaflet pwa in 7 languages,
              with 180+ unit and playwright tests behind it.
            </p>
            <p data-gv="">we also built the marketplace side, so vendors can sell online and get licensed.</p>
            <aside className={styles.take}>
              <p>
                distribution is the most important thing not at scale; but the product is the most important thing at scale.
              </p>
            </aside>
            <RuleWalk />
            <p className={styles.small}>
              the bed is a schematic slice of midtown and the rules are paraphrased examples, not the pdf&apos;s wording. the repo
              is private, so the pins are the demo.
            </p>
          </div>
        </section>

        <section id="rlvr" className={styles.project} data-side="left" aria-labelledby="rlvr-title">
          <div className={styles.stage}>
            <Bed
              bed="rlvr"
              label="500 toy problems as pins, height is pass at k."
              idle="each pin is one toy problem. press one to read its pass@k under both graders."
            />
          </div>
          <div className={styles.copy}>
            <h2 id="rlvr-title" className={styles.title}>
              one lucky number flips a problem from 0 to 1.
            </h2>
            <p className={styles.meta}>
              <strong>rlvr pass@k audit</strong> · in progress · 2026
            </p>
            <p className={styles.thesis}>i read the grader before i believe the benchmark.</p>
            <p data-gv="">
              a neurips 2025 runner-up paper argues that rl fine-tuning only sharpens what a base model can already do, and the
              evidence leans on pass@k at large k. i&apos;m auditing it, preregistered. the released grader scores the last number
              anywhere in a completion, so a sample that rambles long enough can land on the answer by accident. at k = 1024,
              accidents add up.
            </p>
            <p data-gv="">
              the bed is a toy: 500 made-up problems, easy ones in front, hard ones at the back, height is pass@k. turn k up with
              the released grader and watch the back rows go yellow.
            </p>
            <KDial />
            <p data-gv="">
              the audit has 54 tests and a frozen analysis plan, and re-grading the same samples costs zero gpu-hours. a second
              harness splits seven competing explanations for the same result: 78 tests, sized to fit under $600 of compute. no
              results yet. when there are, they go here, good or bad.
            </p>
            <p className={styles.small}>
              <a href="https://github.com/patriotsbreeze/RVLReasoning">the audit</a> ·{" "}
              <a href="https://github.com/patriotsbreeze/SharpeningOrExpansion">the seven explanations</a>
            </p>
          </div>
        </section>

        <section id="meal" className={styles.project} data-side="right" aria-labelledby="meal-title">
          <div className={styles.stage}>
            <Bed
              bed="meal"
              label="a demo meal as a depth map: a plate with rice, chicken and broccoli."
              idle="a demo plate as a depth map. tap a food to estimate it, or press the plate."
            />
          </div>
          <div className={styles.copy}>
            <h2 id="meal-title" className={styles.title}>
              how much rice is that, actually?
            </h2>
            <p className={styles.meta}>
              <strong>lidar calorie app</strong> · nyu shasha lab · summer 2026
            </p>
            <p data-gv="">
              photo-only calorie apps guess the portion. an iphone with lidar can measure it. arkit builds a depth mesh of the
              plate, gemini says what each thing is, and a bayesian map estimate settles the argument between &ldquo;a normal
              portion of rice looks like this&rdquo; and &ldquo;the mesh says {Math.round(rice.volume)} ml&rdquo;.
            </p>
            <MealControls />
            <p className={styles.small}>
              the plate on the bed is a demo meal, not lab data. i also rank restaurants on{" "}
              <a href="https://beliapp.co/app/brendanlo">beli</a>. this felt related.
            </p>
          </div>
        </section>

        <section id="resource" className={styles.night} aria-labelledby="resource-title">
          <div className={styles.copy}>
            <h2 id="resource-title" className={styles.title}>
              first commit 2:41 pm. last commit 11:20 am.
            </h2>
            <p className={styles.meta}>
              <strong>resource</strong> · hoohacks 2026 @ uva · three of us, still in high school
            </p>
            <p data-gv="">
              snap a photo of something you&apos;re getting rid of. gemini vision says what it is in strict json, and it either goes
              on a live campus map for someone to claim or gets routed to uva&apos;s reuse and recycling programs. raffle credits
              for giving things away. 41 commits in a little under 21 hours.
            </p>
            <p className={styles.links}>
              <VideoFacade id="wTmjsvxG6ok" title="resource demo" /> <a href="https://devpost.com/software/resource-i3nq1y">devpost</a> ·{" "}
              <a href="https://hoohacksv2.vercel.app">live</a>
            </p>
          </div>
          <div className={styles.log}>
            <ol className={styles.commits} aria-label="selected commits">
              {keyCommits.map((c) => (
                <li key={c.iso}>
                  <time dateTime={c.iso}>{c.local}</time>
                  <span>{c.message}</span>
                </li>
              ))}
            </ol>
            <details className={styles.allCommits}>
              <summary>all 41 commits</summary>
              <ol className={styles.commits}>
                {NIGHT_COMMITS.map((c) => (
                  <li key={c.iso}>
                    <time dateTime={c.iso}>{c.local}</time>
                    <span>{c.message}</span>
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </section>

        <section className={styles.also} aria-labelledby="also-title">
          <h2 id="also-title" className={styles.alsoTitle}>
            also built
          </h2>
          <ul className={styles.alsoList}>
            <li data-gv="">
              <a href="https://forcenetwork.cloud">force network</a>: game server hosting i&apos;ve co-run since i was 14. 100+
              servers, 800+ users, docker + pterodactyl.
            </li>
            <li data-gv="">
              <a href="https://github.com/patriotsbreeze/crossmodal-fiftyone">crossmodal-fiftyone</a>: finds the moments in a
              video where what you see and what you hear don&apos;t belong together. twelve labs embeddings, hdbscan, flagged past
              mean + 1.5σ.
            </li>
            <li data-gv="">
              satsaurus: free gamified sat prep with a 1v1 mode. 1000+ students, software lead of 5. the site&apos;s down now.
            </li>
            <li data-gv="">
              <a href="https://gnswebdev.club/projects">gns web dev club</a>: co-founded it. 70+ members, 20+ real sites for
              nonprofits, churches and small businesses, plus one rotisserie (
              <a href="https://www.famousrotisserie.com">famous rotisserie &amp; grill</a>).
            </li>
            <li data-gv="">
              research: 3 icml 2026 workshop posters (<a href="https://openreview.net/forum?id=1ZFyQRalEc">hild</a>,{" "}
              <a href="https://openreview.net/forum?id=kbn0sqjGFv">fm4ls</a>,{" "}
              <a href="https://openreview.net/forum?id=wZVHPYvc65">fm4ls</a>).
            </li>
            <li data-gv="">yc startup school 2026.</li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p data-gv="">
          also: great neck, long island → chicago. eagle scout. frc in high school. 9th of 16 authors on a{" "}
          <a href="https://doi.org/10.1083/jcb.202505134">journal of cell biology paper</a>.
        </p>
        {/* Same decoy-string + mailto pattern as the home page. */}
        <p className={styles.contact}>
          say hi: <a href="mailto:brendanlo@uchicago.edu">brendanlo [at] uchicago [dot] edu</a>
        </p>
        <p className={styles.footLinks}>
          <a href="https://github.com/patriotsbreeze">github</a> ·{" "}
          <a href="https://www.linkedin.com/in/brendan-lo-8b0b80247/">linkedin</a> ·{" "}
          <a href="https://beliapp.co/app/brendanlo">beli</a> ·{" "}
          {/* "/" is a different root layout, so this is a full page load either
            * way (route-groups.md); prefetching its payload would be wasted. */}
          <Link href="/" prefetch={false}>
            the plain version
          </Link>
        </p>
        <p className={styles.small}>
          brendanlo.xyz (2025) → brendanlo.com → brendanlo.dev. this is the one where i let myself go.
        </p>
        <p className={styles.small}>
          every pin comes from a function in this site&apos;s code; no 3d files are downloaded. type: big shoulders (chicago&apos;s
          street-sign face), host grotesk, fragment mono. models converge on a consensus aesthetic, so a person deciding it
          should look like this is the scarce part.
        </p>
        <Shortcuts />
      </footer>
    </>
  );
}
