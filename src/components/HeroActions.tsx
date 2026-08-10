import React from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import styles from "./HeroActions.module.css";

/* No pills, no magnetism, no gradient loop. A 1px underline that draws
 * left-to-right on hover, via background-size so it never triggers layout. */
export const HeroActions: React.FC = () => (
  <div className={styles.actions}>
    <a href="/BrendanLo_Resume.pdf" download="BrendanLo_Resume.pdf" className={styles.btn}>
      Résumé
      <ArrowDown size={14} strokeWidth={1.25} aria-hidden />
    </a>
    <a href="#publications" className={styles.btn}>
      Selected research
      <ArrowRight size={14} strokeWidth={1.25} aria-hidden />
    </a>
  </div>
);
