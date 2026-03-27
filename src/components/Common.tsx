import React from 'react';
import styles from './Components.module.css';

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

export const ProjectCard: React.FC<{ project: any }> = ({ project }) => (
  <div className={styles.projectRow}>
    <div className={styles.projectInfo}>
      <div className={styles.projectHeader}>
        <h3 className={styles.projectTitle}>{project.title}</h3>
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
            ↗
          </a>
        )}
      </div>
      <p className={styles.projectDescription}>{project.description}</p>
      <div className={styles.techStackThin}>
        {project.technologies.slice(0, 4).map((tech: string) => (
          <span key={tech} className={styles.techBadgeThin}>{tech}</span>
        ))}
        {project.technologies.length > 4 && <span>+</span>}
      </div>
    </div>
    {project.image && (
      <div className={styles.projectPeek}>
        <img src={project.image} alt={project.title} className={styles.peekImage} />
      </div>
    )}
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
  </div>
);
