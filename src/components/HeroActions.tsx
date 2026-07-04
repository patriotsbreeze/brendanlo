"use client";

import React, { useRef } from "react";
import { FaArrowDown, FaFileArrowDown } from "react-icons/fa6";
import styles from "./HeroActions.module.css";

const Magnetic: React.FC<{
  children: React.ReactNode;
  href: string;
  variant: "solid" | "ghost";
  download?: boolean;
}> = ({ children, href, variant, download }) => {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.4}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  };

  return (
    <a
      ref={ref}
      href={href}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`${styles.btn} ${variant === "solid" ? styles.solid : styles.ghost}`}
      {...(download
        ? { download: "BrendanLo_Resume.pdf" }
        : {})}
      {...(href.startsWith("http")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      <span className={styles.btnInner}>{children}</span>
    </a>
  );
};

export const HeroActions: React.FC = () => (
  <div className={styles.actions}>
    <Magnetic href="/BrendanLo_Resume.pdf" variant="solid" download>
      <FaFileArrowDown size={15} /> Resume
    </Magnetic>
    <Magnetic href="#projects" variant="ghost">
      View Work <FaArrowDown size={13} />
    </Magnetic>
  </div>
);
