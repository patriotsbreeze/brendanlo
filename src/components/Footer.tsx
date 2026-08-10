import React from "react";
import { ArrowUpRight } from "lucide-react";
import { resumeData } from "@/data/resumeData";
import { SocialLinks } from "@/components/SocialLinks";
import styles from "./Footer.module.css";

/* The CTA is the actual ask, not "let's build something great." */
export const Footer: React.FC = () => (
  <footer className={styles.footer} id="contact">
    <div className={styles.inner}>
      <p className={styles.kicker}>§ Contact</p>
      <h2 className={styles.big}>
        Looking for summer 2027 research
        <br />
        and engineering internships.
      </h2>

      <a href={`mailto:${resumeData.email}`} className={styles.email}>
        {resumeData.email}
        <ArrowUpRight size={20} strokeWidth={1.25} aria-hidden />
      </a>

      <div className={styles.bar}>
        <span className={styles.copy}>
          © {new Date().getFullYear()} Brendan Lo
        </span>
        <SocialLinks />
      </div>
    </div>
  </footer>
);
