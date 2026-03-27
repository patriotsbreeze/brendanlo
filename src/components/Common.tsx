import React from 'react';
import styles from './Components.module.css';
import { ArrowUpRight, Star, GitFork } from 'lucide-react';

export const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`${styles.container} ${className || ''}`}>{children}</div>
);

export const Section: React.FC<{ id?: string; children: React.ReactNode; className?: string }> = ({ id, children, className }) => (
  <section id={id} className={`${styles.section} ${className || ''}`}>
    {children}
  </section>
);

export const SectionHeading: React.FC<{ children: React.ReactNode; subtitle?: string }> = ({ children, subtitle }) => (
  <div className={styles.headingWrapper}>
    <h2 className={styles.sectionHeading}>{children}</h2>
    {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
  </div>
);

export const TechPill: React.FC<{ name: string; icon?: React.ReactNode }> = ({ name, icon }) => (
  <div className="pill">
    {icon && <span style={{ display: 'flex' }}>{icon}</span>}
    {name}
  </div>
);

export const ProjectCard: React.FC<{ project: any }> = ({ project }) => (
  <div className={styles.projectCard}>
    <div className={styles.projectHeader}>
      <h3 className={styles.projectTitle}>{project.title}</h3>
      {project.link && (
        <a href={project.link} target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
          <ArrowUpRight size={18} />
        </a>
      )}
    </div>
    <p className={styles.projectDescription}>{project.description}</p>
    
    <div className={styles.projectFooter}>
      <div className={styles.projectTech}>
        {project.technologies.slice(0, 3).map((tech: string) => (
          <span key={tech} className={styles.techTagSmall}>{tech}</span>
        ))}
      </div>
      
      {/* Mocking stats to match cresqnt aesthetic */}
      <div className={styles.projectStats}>
        <span className={styles.statItem}><Star size={12} /> {Math.floor(Math.random() * 50) + 10}</span>
        <span className={styles.statItem}><GitFork size={12} /> {Math.floor(Math.random() * 10) + 2}</span>
      </div>
    </div>
  </div>
);

export const ExperienceCard: React.FC<{ exp: any }> = ({ exp }) => (
  <div className={styles.expRow}>
    <div className={styles.expHeader}>
      <h3 className={styles.expRole}>{exp.role}</h3>
      <span className={styles.expPeriod}>{exp.period}</span>
    </div>
    <div className={styles.expMeta}>
      <span className={styles.expCompany}>{exp.company}</span>
      <span className={styles.expLocation}>{exp.location}</span>
    </div>
    <ul className={styles.expDescList}>
      {exp.description.map((item: string, i: number) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  </div>
);

