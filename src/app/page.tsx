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
        <span className="sep">|</span>
        <a
          href="https://www.linkedin.com/in/brendan-lo-8b0b80247/"
          target="_blank"
          rel="noopener noreferrer"
        >
          linkedin
        </a>
        <span className="sep">|</span>
        <a
          href="https://github.com/patriotsbreeze"
          target="_blank"
          rel="noopener noreferrer"
        >
          github
        </a>
        <span className="sep">|</span>
        <a
          href="https://beliapp.co/app/brendanlo"
          target="_blank"
          rel="noopener noreferrer"
        >
          beli
        </a>
      </p>

      <p className="bio">
        hi, i&apos;m brendan lo, 18, cs + math @ uchicago. i enjoy ai/ml
        research, hanging out with my friends, and building really cool things.
      </p>

      <h2>highlights &amp; accomplishments</h2>
      <p>
        3x icml, yc sus &rsquo;26, eagle scout, 2nd @ nyc hackathon, 1x journal
        of cell biology paper, frc robotics world&rsquo;s engineering inspiration
        award, and a bunch of projects totalling 10k users.
      </p>

      <h2>my takes</h2>
      <ul>
        <li>
          philosophy is important; but uncontrolled philosophical thinking
          -&gt; arrogance.
        </li>
        <li>
          distribution is the most important thing not at scale; but the product
          is the most important thing at scale.
        </li>
        <li>
          agi will be reached when we are able to make something capable of all
          human senses.
          <ul>
            <li>
              for ex, neural networks and CoT reasoning are partially based on
              how the brain works.
            </li>
            <li>
              world models, better synthetic data generation (digital twins or
              better?), llms, and some new architecture (still unknown) will get
              us there.
            </li>
          </ul>
        </li>
        <li>
          frontend is more important than ever. true, human originality and art
          is vital to ui/ux.
          <ul>
            <li>
              llm&rsquo;s will keep improving, but not to the point of
              understanding ai slop. all the frontier models will produce new and
              newer outputs, which will eventually develop a consensus of ai
              slop.
            </li>
          </ul>
        </li>
      </ul>

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
