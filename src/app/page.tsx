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
    name: "columbia",
    href: "https://www.columbia.edu/",
    years: "2026",
    body: "topological data analysis for rna-seq annotation in the blumberg lab.",
  },
  {
    name: "nyu",
    href: "https://cs.nyu.edu/~shasha/",
    years: "2026",
    body: "built an agentic ai workflow for a calorie-tracking app in the shasha lab.",
  },
  {
    name: "weill cornell",
    href: "https://doi.org/10.1083/jcb.202505134",
    years: "2025",
    body: "python + fiji/imagej + vba analysis on how calcium drives cardiomyocyte proliferation (kühn & liu lab). ended up as a paper in the journal of cell biology.",
  },
  {
    name: "weill cornell",
    years: "2024",
    body: "pcr, western blot, cloning, and rna-seq in r + python to find genes regulated by jarid2 (long lab). basically: what prc2 does to a developing heart.",
  },
  {
    name: "prc2 drug discovery",
    years: "2024-2025",
    body: "random-forest virtual screening in schrödinger maestro + gromacs md sims, repurposing drugs to inhibit prc2 for cancer and congenital heart disease.",
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
    name: "resource",
    href: "https://devpost.com/software/resource-i3nq1y",
    body: "ai marketplace for donating, reselling, or recycling stuff you don't want. next.js, supabase, postgres, gemini for image recognition, mapbox for the community map.",
  },
  {
    name: "sidewalk",
    body: "turned nyc's pdf-only street-vending rules into a queryable geospatial dataset behind an offline-first map, in 7 languages. deno etl resolves each restriction to a block face via bfs over the street centerline graph. 2nd place, nyc hackathon (shopify × base44).",
  },
  {
    name: "satsaurus",
    body: "gamified sat prep, free, 1000+ students. next.js + supabase.",
  },
  {
    name: "gns web dev club",
    href: "https://gnswebdev.club/projects",
    body: "cofounded it, 70+ members, 20+ sites shipped for nonprofits, churches, businesses, and school clubs.",
  },
  {
    name: "force network",
    href: "https://forcenetwork.cloud",
    body: "hosting hub for 100+ minecraft servers, 800+ users. node, docker, mongodb, pterodactyl.",
  },
];

const misc: Entry[] = [
  {
    name: "y combinator startup school",
    years: "2026",
    body: "selected attendee.",
  },
  {
    name: "first robotics 2638",
    years: "2024-2026",
    body: "lead programmer + head webmaster. wrote the trajectory generation and robot control; went to worlds in 2025.",
  },
  {
    name: "kudos connect",
    years: "2024-2026",
    body: "cto + newsletter lead, 15+ people, 7000+ students reading about volunteer opportunities.",
  },
  {
    name: "other stuff",
    body: "eagle scout, 3x 1st place science olympiad regionals, cross country all-conference.",
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
        {/* Written out so scrapers get the decoy string and humans get a
          * working mailto. */}
        <a href="mailto:brendanlo@uchicago.edu">
          brendanlo [at] uchicago [dot] edu
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

      <p className="footer">
        say hi &mdash;{" "}
        <a href="mailto:brendanlo@uchicago.edu">
          brendanlo [at] uchicago [dot] edu
        </a>
      </p>
    </main>
  );
}
