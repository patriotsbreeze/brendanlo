import React from 'react';
import Image from 'next/image';
import styles from './Components.module.css';
import { ArrowUpRight } from 'lucide-react';
import type { Education, Experience, Project, Publication } from '@/data/resumeData';

export const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`${styles.container} ${className || ''}`}>{children}</div>
);

export const Section: React.FC<{
  id?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ id, children, className }) => (
  <section id={id} className={`${styles.section} ${className || ''}`}>
    {children}
  </section>
);

/* The editorial grid: a mono label sits in the left gutter, content flows in the
 * wide right column, and hairline rules run edge-to-edge across both — rules
 * longer than the text they organise. Collapses to one column under 900px. */
export const EditorialSection: React.FC<{
  id?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}> = ({ id, label, children, className, accent }) => (
  <section id={id} className={`${styles.section} ${className || ''}`}>
    <div className={styles.container}>
      <div className={styles.editorialGrid}>
        <div className={`${styles.gutter} ${accent ? styles.gutterAccent : ''}`}>
          <h2 className={styles.gutterLabel}>
            <span aria-hidden>§ </span>
            {label}
          </h2>
        </div>
        <div className={styles.contentCol}>{children}</div>
      </div>
    </div>
  </section>
);

/* Tech tags are mono text separated by middots. No fill, no border, no pill. */
export const TechList: React.FC<{ items: string[]; max?: number }> = ({ items, max }) => (
  <p className={styles.techList}>{(max ? items.slice(0, max) : items).join(' · ')}</p>
);

/* ── Projects ──────────────────────────────────────────────────────────── */

export const ProjectPlate: React.FC<{ project: Project }> = ({ project }) => {
  const inner = (
    <>
      {project.image && (
        <div className={styles.plateImageWrap}>
          <Image
            src={project.image}
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 900px) 100vw, 46vw"
            className={styles.plateImage}
          />
        </div>
      )}
      <div className={styles.plateBody}>
        <div className={styles.rowTop}>
          <h3 className={styles.plateTitle}>{project.title}</h3>
          {project.link && (
            <span className={styles.arrow} aria-hidden>
              <ArrowUpRight size={18} strokeWidth={1.25} />
            </span>
          )}
        </div>
        <p className={styles.plateDesc}>{project.impact || project.description}</p>
        <TechList items={project.technologies} />
      </div>
    </>
  );

  return project.link ? (
    <a
      href={project.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.plate} ${styles.linked}`}
      aria-label={`${project.title} (opens in a new tab)`}
    >
      {inner}
    </a>
  ) : (
    <div className={styles.plate}>{inner}</div>
  );
};

export const ProjectRow: React.FC<{ project: Project }> = ({ project }) => {
  const inner = (
    <>
      <div className={styles.rowTop}>
        <h3 className={styles.rowTitle}>{project.title}</h3>
        {project.link && (
          <span className={styles.arrow} aria-hidden>
            <ArrowUpRight size={18} strokeWidth={1.25} />
          </span>
        )}
      </div>
      <p className={styles.rowDesc}>{project.description}</p>
      <TechList items={project.technologies} />
    </>
  );

  return project.link ? (
    <a
      href={project.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.row} ${styles.linked}`}
      aria-label={`${project.title} (opens in a new tab)`}
    >
      {inner}
    </a>
  ) : (
    <div className={styles.row}>{inner}</div>
  );
};

/* ── Publications ──────────────────────────────────────────────────────── */

const AUTHOR_RE = /&?\s*[^,]+,\s*(?:[A-Z]\.\s*)+/g;

/**
 * Truncate a long author list from the middle while always preserving a window
 * around the marked name, so it stays visible at every viewport width. The JCB
 * paper has 17 authors; rendered in full that is five lines of grey noise on
 * mobile which pushes the next paper off screen.
 */
export function authorWindow(
  authors: string,
  me = 'Lo, B.',
  before = 3,
  after = 2
): { text: string; me: string }[] {
  // Strip the trailing-conjunction ampersand so the last author does not render
  // as "& Lo, B." with the ampersand swept into the highlight.
  const list = (authors.match(AUTHOR_RE) || []).map((a) =>
    a.trim().replace(/^&\s*/, '').replace(/,$/, '')
  );
  if (!list.length) return [{ text: authors, me: '' }];

  const idx = list.findIndex((a) => a.includes(me));
  if (idx === -1 || list.length <= before + after + 2) {
    return list.map((a) => ({ text: a, me: a.includes(me) ? me : '' }));
  }

  const start = Math.max(0, idx - before);
  const end = Math.min(list.length, idx + after + 1);
  const out: { text: string; me: string }[] = [];

  if (start > 0) out.push({ text: '…', me: '' });
  for (let i = start; i < end; i++) {
    out.push({ text: list[i], me: list[i].includes(me) ? me : '' });
  }
  if (end < list.length) out.push({ text: '…', me: '' });
  return out;
}

const AuthorLine: React.FC<{ authors: string }> = ({ authors }) => (
  <p className={styles.pubAuthors}>
    {authorWindow(authors).map((a, i, arr) => (
      <React.Fragment key={i}>
        {a.me ? <span className={styles.pubMe}>{a.text}</span> : a.text}
        {i < arr.length - 1 && ', '}
      </React.Fragment>
    ))}
  </p>
);

export const PublicationRow: React.FC<{ pub: Publication }> = ({ pub }) => {
  const inner = (
    <>
      <div className={styles.pubMeta}>
        <span className={styles.pubYear}>{pub.year}</span>
        <span className={styles.pubType}>{pub.type}</span>
        {pub.link && (
          <span className={styles.arrow} aria-hidden>
            <ArrowUpRight size={18} strokeWidth={1.25} />
          </span>
        )}
      </div>
      <div className={styles.pubBody}>
        <h3 className={styles.pubTitle}>{pub.title}</h3>
        {/* The venue is the credential — it gets its own line at body weight
         * in full ink, rather than a muted span beside a grey chip. */}
        <p className={styles.pubVenue}>{pub.venue}</p>
        {pub.doi && <p className={styles.pubDoi}>{pub.doi}</p>}
        <AuthorLine authors={pub.authors} />
      </div>
    </>
  );

  return pub.link ? (
    <a
      href={pub.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.pubRow} ${styles.linked}`}
      aria-label={`${pub.title} — ${pub.venue} (opens in a new tab)`}
    >
      {inner}
    </a>
  ) : (
    <div className={styles.pubRow}>{inner}</div>
  );
};

/* ── Experience ────────────────────────────────────────────────────────── */

export const ExperienceRow: React.FC<{ exp: Experience }> = ({ exp }) => (
  <div className={styles.expRow}>
    {/* The period in the gutter, in mono — same visual anchor the monogram
     * bead provided, but carrying information instead of decorating. */}
    <p className={styles.expPeriod}>{exp.period}</p>
    <div className={styles.expBody}>
      <h3 className={styles.expRole}>{exp.role}</h3>
      <p className={styles.expOrg}>
        {exp.company}
        <span className={styles.expLocation}>{exp.location}</span>
      </p>
      <ul className={styles.expDescList}>
        {exp.description.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  </div>
);

/* ── Colophon ──────────────────────────────────────────────────────────── */

export const ColophonRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className={styles.colRow}>
    <p className={styles.colKey}>{label}</p>
    <div className={styles.colVal}>{children}</div>
  </div>
);

export const EducationRow: React.FC<{ edu: Education }> = ({ edu }) => (
  <ColophonRow label={edu.period}>
    <p className={styles.colTitle}>{edu.school}</p>
    <p className={styles.colNote}>{edu.degree}</p>
    {edu.details?.map((d, i) => (
      <p key={i} className={styles.colNote}>
        {d}
      </p>
    ))}
  </ColophonRow>
);
