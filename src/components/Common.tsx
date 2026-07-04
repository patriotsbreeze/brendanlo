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

export const SectionHeading: React.FC<{ children: React.ReactNode; subtitle?: string; index?: string }> = ({ children, subtitle, index }) => (
  <div className={styles.headingWrapper}>
    {index && (
      <span className={styles.eyebrow}>
        <span className={styles.eyebrowNum}>{index}</span>
        <span className={styles.eyebrowLine} />
      </span>
    )}
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

export const ProjectCard: React.FC<{ project: any; featured?: boolean }> = ({ project, featured }) => {
  const maxTags = featured ? 6 : 3;
  return (
    <div className={`${styles.projectCard} ${featured ? styles.projectFeatured : ""}`}>
      {featured && project.image && (
        <div className={styles.projectImageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.image} alt={project.title} className={styles.projectImage} />
        </div>
      )}
      <div className={styles.projectContent}>
        <div>
          <div className={styles.projectHeader}>
            <div className={styles.projectTitleRow}>
              {featured && <span className={styles.projectBadge}>Featured</span>}
              <h3 className={styles.projectTitle}>{project.title}</h3>
            </div>
            {project.link && (
              <a href={project.link} target="_blank" rel="noopener noreferrer" className={styles.projectLink} aria-label={`View ${project.title} project`}>
                <ArrowUpRight size={18} />
              </a>
            )}
          </div>
          <p className={styles.projectDescription}>
            {featured && project.impact ? project.impact : project.description}
          </p>
        </div>

        <div className={styles.projectFooter}>
          <div className={styles.projectTech}>
            {project.technologies.slice(0, maxTags).map((tech: string) => (
              <span key={tech} className={styles.techTagSmall}>{tech}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const monogram = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Z0-9]/.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();

export const EducationCard: React.FC<{ edu: any }> = ({ edu }) => (
  <div className={styles.expRow}>
    <div className={styles.node} aria-hidden>{monogram(edu.school)}</div>
    <div className={styles.expBody}>
      <div className={styles.expHeader}>
        <h3 className={styles.expRole}>{edu.school}</h3>
        <span className={styles.expPeriod}>{edu.period}</span>
      </div>
      <div className={styles.expMeta}>
        <span className={styles.expCompany}>{edu.degree}</span>
        <span className={styles.expLocation}>{edu.location}</span>
      </div>
      {edu.details && edu.details.length > 0 && (
        <ul className={styles.expDescList}>
          {edu.details.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

const boldInitials = (authors: string) => {
  const parts = authors.split(/(Lo, B\.)/g);
  return parts.map((part, i) =>
    part === "Lo, B." ? <strong key={i} className={styles.pubMe}>{part}</strong> : part
  );
};

export const PublicationCard: React.FC<{ pub: any }> = ({ pub }) => {
  const inner = (
    <>
      <div className={styles.pubTop}>
        <span className={styles.pubType}>{pub.type}</span>
        <span className={styles.pubVenue}>{pub.venue} · {pub.year}</span>
      </div>
      <h3 className={styles.pubTitle}>{pub.title}</h3>
      <p className={styles.pubAuthors}>{boldInitials(pub.authors)}</p>
    </>
  );
  return pub.link ? (
    <a href={pub.link} target="_blank" rel="noopener noreferrer" className={`${styles.pubRow} ${styles.pubLinked}`}>
      {inner}
      <span className={styles.pubArrow} aria-hidden><ArrowUpRight size={18} /></span>
    </a>
  ) : (
    <div className={styles.pubRow}>{inner}</div>
  );
};

export const ExperienceCard: React.FC<{ exp: any }> = ({ exp }) => (
  <div className={styles.expRow}>
    <div className={styles.node} aria-hidden>{monogram(exp.company)}</div>
    <div className={styles.expBody}>
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
  </div>
);

