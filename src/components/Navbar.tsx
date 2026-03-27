"use client";

import React, { useState, useEffect } from 'react';
import { resumeData } from '@/data/resumeData';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.navWrapper}>
      <nav className={`${styles.navbarPill} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.links}>
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="#experience">Experience</a>
        </div>
      </nav>
    </div>
  );
};


