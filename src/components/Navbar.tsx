"use client";

import React, { useState, useEffect } from 'react';
import styles from './Navbar.module.css';

const NAV = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'publications', label: 'Research' },
  { id: 'experience', label: 'Experience' },
];

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [active, setActive] = useState('about');

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

  return (
    <div className={styles.navWrapper}>
      <nav className={`${styles.navbarPill} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.links}>
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              aria-label={`${n.label} section`}
              className={active === n.id ? styles.activeLink : ''}
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
};
