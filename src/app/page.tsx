import type { ReactNode } from "react";

/* Every section on this page is the same shape: a leading token that is
 * sometimes a link, an optional year, and a sentence. One component, one data
 * array per heading. */
type Entry = {
  name: string;
  href?: string;
  years?: string;
  body: ReactNode;
};

const research: Entry[] = [
  {
    name: "nyu",
    href: "https://cs.nyu.edu/~shasha/",
    years: "2026",
    body: "software engineer intern in the shasha lab. built an ai calorie-tracking app that beats commercial apps on accuracy — bayesian map estimation, lidar depth capture, arkit, and the gemini api, all in swift.",
  },
  {
    name: "weill cornell",
    href: "https://doi.org/10.1083/jcb.202505134",
    years: "2024-2025",
    body: "two summers of data analysis. in the kuhn & liu lab i characterized calcium's role in cardiomyocyte proliferation with python + fiji/imagej image and signal analysis, which became the journal of cell biology paper below. in the long lab (genomics) it was rna-seq, pcr, western blot, and cloning in r + python to find jarid2 gene targets and probe prc2 in congenital heart disease.",
  },
];

const papers: Entry[] = [
  {
    name: "sequential changes in calcium transients during M phase",
    href: "https://doi.org/10.1083/jcb.202505134",
    years: "2026",
    body: "journal of cell biology. liu et al., i'm the ninth author.",
  },
  {
    name: "a horizon-dependent intrinsic-dimension theory of scaling",
    href: "https://openreview.net/forum?id=1ZFyQRalEc",
    years: "2026",
    body: "icml hild workshop. why biological forecasting scales the way it does.",
  },
  {
    name: "ervnet",
    href: "https://openreview.net/forum?id=kbn0sqjGFv",
    years: "2026",
    body: "icml fm4ls workshop. three-module framework predicting endogenous retrovirus reactivation, propagation, and immunogenicity.",
  },
  {
    name: "proteus",
    href: "https://openreview.net/forum?id=wZVHPYvc65",
    years: "2026",
    body: "icml fm4ls workshop. predicting how post-translational modifications change drug binding affinity.",
  },
];

const projects: Entry[] = [
  {
    name: "sidewalk",
    years: "2026",
    body: "marketplace app that helps nyc street vendors sell online and get licensed, and makes the city's vending rules searchable for the first time — a deno/typescript pipeline turns a 190-entry pdf into map data by graph search over nyc street records. offline-capable react/leaflet map in 7 languages, 180+ automated tests. 2nd place, nyc hackathon (shopify × base44).",
  },
  {
    name: "satsaurus",
    years: "2025-2026",
    body: "cofounder + software lead. led a team of five building a gamified sat-prep web app in next.js and supabase, now used by 1000+ students.",
  },
  {
    name: "force network",
    href: "https://forcenetwork.cloud",
    years: "2022-present",
    body: "cofounder + software lead. built and run a linux hosting hub for 100+ game servers, shipping docker deployment tooling and bandwidth to 800+ users.",
  },
];

const misc: Entry[] = [
  {
    name: "gns web dev club",
    href: "https://gnswebdev.club/projects",
    years: "2024-2026",
    body: "cofounded and co-led it. full-stack teams across 70+ members in typescript, react, and supabase; 20+ sites shipped and maintained for nonprofits, businesses, and school organizations.",
  },
  {
    name: "kudos connect",
    years: "2024-present",
    body: "cto. directed a 15-person team building the site and newsletter, reaching 7000+ students.",
  },
  {
    name: "first robotics 2638",
    years: "2024-2026",
    body: "head webmaster + lead programmer. wrote the trajectory-generation algorithms and robot control code; team advanced to the frc world championship in 2025.",
  },
  {
    name: "programming club",
    years: "2024-2026",
    body: "software + app lead. taught 20+ students python, java, and applied ml; led 10 students building a swift school app for 1300+ students.",
  },
  {
    name: "awards",
    body: "y combinator startup school 2026 (selected attendee), eagle scout, science olympiad national qualifier and 2nd in new york state, engineering inspiration award at the frc world championship, honorable mention at the long island science & engineering fair.",
  },
];

function Line({ name, href, years, body }: Entry) {
  return (
    <p className="entry">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {name}
        </a>
      ) : (
        <span className="name">{name}</span>
      )}
      {years ? <span className="year"> ({years})</span> : null} - {body}
    </p>
  );
}

function Sep() {
  return <span className="sep">|</span>;
}

export default function Page() {
  return (
    <main>
      <div className="headerRow">
        <h1>brendan lo</h1>
        <span className="aside">chicago, il</span>
      </div>

      <p className="links">
        <a href="/BrendanLo_Resume.pdf" target="_blank" rel="noopener noreferrer">
          resume
        </a>
        <Sep />
        <a
          href="https://www.linkedin.com/in/brendan-lo-8b0b80247/"
          target="_blank"
          rel="noopener noreferrer"
        >
          linkedin
        </a>
        <Sep />
        <a
          href="https://github.com/patriotsbreeze"
          target="_blank"
          rel="noopener noreferrer"
        >
          github
        </a>
        <Sep />
        <a
          href="https://beliapp.co/app/brendanlo"
          target="_blank"
          rel="noopener noreferrer"
        >
          beli
        </a>
      </p>

      <p className="bio">
        hi, i&apos;m brendan lo, 18, cs + math @ uchicago. i&apos;m pretty
        interested in ai/ml (sometimes bio) research. i enjoy going to hackathons
        (esp b/c free things + prizes), hanging out with my friends, and building
        really cool things.
      </p>

      <h2>research</h2>
      {research.map((e, i) => (
        <Line key={`research-${i}`} {...e} />
      ))}

      <h2>papers</h2>
      {papers.map((e, i) => (
        <Line key={`paper-${i}`} {...e} />
      ))}

      <h2>projects</h2>
      {projects.map((e, i) => (
        <Line key={`project-${i}`} {...e} />
      ))}

      <h2>otherwise</h2>
      {misc.map((e, i) => (
        <Line key={`misc-${i}`} {...e} />
      ))}

      {/* Written out so scrapers get the decoy string and humans get a working
        * mailto. This is the only place the address appears. */}
      <p className="footer">
        say hi &mdash;{" "}
        <a href="mailto:brendanlo@uchicago.edu">
          brendanlo [at] uchicago [dot] edu
        </a>
      </p>
    </main>
  );
}
