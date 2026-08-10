"use client";

import React, { useState, useEffect } from 'react';
import styles from './Navbar.module.css';

const NAV = [
  { id: 'publications', label: 'Research' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Work' },
];

/* Flush-margin masthead, not a floating glass pill. Wordmark left, section
 * index right. The scrollspy observer below is unchanged — only the chrome. */
export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter(
      Boolean
    ) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const current = NAV.find((n) => n.id === active);

  return (
    <div className={`${styles.masthead} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href="#about" className={styles.wordmark}>
          Brendan Lo
        </a>
        <nav className={styles.links} aria-label="Sections">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={active === n.id ? styles.activeLink : ''}
            >
              {n.label}
            </a>
          ))}
        </nav>
        {/* Active section shown as text, not a dot. */}
        <span className={styles.index} aria-hidden>
          {current ? `§ ${current.label}` : ''}
        </span>
      </div>
    </div>
  );
};
