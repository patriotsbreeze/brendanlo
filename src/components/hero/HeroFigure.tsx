import React from "react";
import { HeroCanvasMount } from "./HeroCanvasMount";
import { FigureControl } from "./FigureControl";
import { TIERS } from "./tiers";
import styles from "./HeroFigure.module.css";

/**
 * Fig. 1 — the bounded plate the filtration lives in.
 *
 * A Server Component on purpose: the frame, the readout shell and the caption
 * ship in the prerendered HTML, and only the WebGL is deferred. That is what
 * keeps CLS at zero (aspect-ratio reserves the height before anything loads)
 * and keeps the <h1> as the LCP element.
 */
export const HeroFigure: React.FC<{ className?: string }> = ({ className }) => (
  <figure className={`${styles.figure} ${className || ""}`}>
    <div className={styles.plate}>
      {/* Values are em-dashes until the scene's first frame writes them: before
        * the canvas mounts there is no filtration, so a number would be a lie. */}
      <dl className={styles.readout} id="fig1-readout">
        <dt>ε</dt>
        <dd data-eps>—</dd>
        <dt>H₀</dt>
        <dd data-h0>—</dd>
        <dt>|B(x,ε)|</dt>
        <dd data-ball>—</dd>
      </dl>

      <HeroCanvasMount />

      {/* Last child, above the canvas. The canvas keeps pointer-events: none
        * and only draws; this element receives every gesture. */}
      <FigureControl />
    </div>

    <figcaption>
      <p className={styles.figLabel}>
        Fig. 1 — Vietoris–Rips filtration of a synthetic cell-cycle manifold
      </p>
      {/* Every clause here is checkable against filtration.ts. Deliberately no
        * claim of provenance from the published Columbia or Weill Cornell data:
        * this manifold is seeded by mulberry32, and implying otherwise on a page
        * whose whole argument is that it reads like a preprint would be the most
        * damaging thing on it. */}
      <p className={`${styles.figBody} ${styles.figBodyLong}`}>
        {TIERS.full.points.toLocaleString("en-US")} points sampled on a noisy loop with
        one branch in R⁸, projected to R³ through the top three principal components.
        Edges enter as ε grows; H₀ is the exact component count, by union-find.
      </p>
      <p className={`${styles.figBody} ${styles.figBodyShort}`}>
        {TIERS.reduced.points} points on a noisy loop with one branch in R⁸, projected
        to R³. H₀ is exact, by union-find.
      </p>
    </figcaption>
  </figure>
);
