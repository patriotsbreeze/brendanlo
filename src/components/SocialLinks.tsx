import React from 'react';
import { resumeData } from '@/data/resumeData';
import styles from './SocialLinks.module.css';

/* Mono text links, not logo glyphs. lucide-react v1 dropped brand icons, and
 * named links read better on an editorial page than a row of circles anyway —
 * which also lets react-icons go entirely. */
const LINKS = [
  { href: resumeData.socials.github, label: 'GitHub' },
  { href: resumeData.socials.linkedin, label: 'LinkedIn' },
  { href: resumeData.socials.instagram, label: 'Instagram' },
];

export const SocialLinks: React.FC = () => (
  <nav className={styles.socials} aria-label="Elsewhere">
    {LINKS.map(({ href, label }) => (
      <a
        key={label}
        href={href}
        className={styles.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    ))}
  </nav>
);
