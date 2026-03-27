import React from 'react';
import styles from './Navbar.module.css';
import { Container } from './Common';
import { FaGithub, FaLinkedin, FaInstagram } from 'react-icons/fa';
import { resumeData } from '@/data/resumeData';

export const Navbar: React.FC = () => {
  return (
    <nav className={styles.navbar}>
      <Container className={styles.navContainer}>
        <div className={styles.logo}>
          <a href="#">Brendan <strong>Lo</strong></a>
        </div>
        <div className={styles.links}>
          <a href="#projects">Projects</a>
          <a href="#experience">Experience</a>
          <div className={styles.socials}>
            <a href={resumeData.socials.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub size={20} />
            </a>
            <a href={resumeData.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedin size={20} />
            </a>
            <a href={resumeData.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram size={20} />
            </a>
          </div>
          <a href={`mailto:${resumeData.email}`} className={styles.cta}>Hire Me</a>
        </div>
      </Container>
    </nav>
  );
};
