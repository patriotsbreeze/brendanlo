"use client";

import React, { useRef } from "react";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { resumeData } from "@/data/resumeData";
import { SocialLinks } from "@/components/SocialLinks";
import styles from "./Footer.module.css";

export const Footer: React.FC = () => {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };

  const toTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.kicker}>Let&apos;s work together</p>
        <h2 className={styles.big}>
          Let&apos;s build
          <br />
          something great.
        </h2>

        <a
          ref={ref}
          href={`mailto:${resumeData.email}`}
          className={styles.emailBtn}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
        >
          <span className={styles.emailInner}>
            {resumeData.email}
            <ArrowUpRight size={20} />
          </span>
        </a>

        <div className={styles.socials}>
          <SocialLinks />
        </div>

        <div className={styles.bar}>
          <span className={styles.copy}>
            © {new Date().getFullYear()} Brendan Lo · Built with Next.js
          </span>
          <a href="#about" className={styles.top} onClick={toTop}>
            Back to top <ArrowUp size={15} />
          </a>
        </div>
      </div>
    </footer>
  );
};
