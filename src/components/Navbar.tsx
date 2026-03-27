import React from 'react';
import styles from './Navbar.module.css';
import { Container } from './Common';

export const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <Container className={styles.navContainer}>
        <div className={styles.logo}>
          Brendan <strong>Lo</strong>
        </div>
        <div className={styles.links}>
          <a href="#projects">Projects</a>
          <a href="#experience">Experience</a>
          <a href="#skills">Skills</a>
          <a href="mailto:brendanlo@uchicago.edu" className={styles.cta}>Hire Me</a>
        </div>
      </Container>
    </nav>
  );
};
