import styles from "./page.module.css";
import { resumeData } from "@/data/resumeData";
import {
  Container,
  Section,
  EditorialSection,
  ProjectPlate,
  ProjectRow,
  PublicationRow,
  ExperienceRow,
  EducationRow,
  ColophonRow,
} from "@/components/Common";
import { SocialLinks } from "@/components/SocialLinks";
import { HeroName } from "@/components/HeroName";
import { HeroFigure } from "@/components/hero/HeroFigure";
import { HeroActions } from "@/components/HeroActions";
import { Ledger } from "@/components/Ledger";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

export default function Home() {
  const { experience, featuredProjects, publications, education, skillsList } = resumeData;

  const research = experience.filter((e) => e.kind === "research");
  const engineering = experience.filter((e) => e.kind === "engineering");
  const [plate, ...rest] = featuredProjects;

  return (
    <div className={styles.main}>
      {/* Hero */}
      <Section id="about" className={styles.heroSection}>
        <Container>
          <div className={styles.hero}>
            {/* immediate: above the fold, so it ships visible in the SSR HTML
              * rather than at opacity 0 until hydration lands. */}
            <Reveal immediate className={styles.spanFull}>
              <p className={styles.heroMeta}>
                CS <span className={styles.amp}>&amp;</span> Mathematics · University of
                Chicago · 2030
              </p>
            </Reveal>

            <HeroName text={resumeData.name} className={styles.spanFull} />

            <div className={styles.heroBody}>
              <Reveal immediate index={1}>
                <p className={styles.heroLead}>
                  Computational biology and machine learning. Co-author on four 2026
                  papers — one in the <em>Journal of Cell Biology</em>, three at ICML
                  workshops — written in high school.
                </p>
              </Reveal>

              <Reveal immediate index={2}>
                <Ledger />
              </Reveal>

              <Reveal immediate index={3}>
                <div className={styles.heroFoot}>
                  <HeroActions />
                  <SocialLinks />
                </div>
              </Reveal>
            </div>

            {/* Last in DOM order, so single-column reading order stays correct
              * and no `order` override is needed on mobile. */}
            <HeroFigure className={styles.colFig} />
          </div>
        </Container>
      </Section>

      {/* The strongest signal, first and with the most air on the page. */}
      <EditorialSection
        id="publications"
        label="Selected research"
        accent
        className={styles.researchSection}
      >
        {publications.map((pub, i) => (
          <Reveal key={pub.title} index={i}>
            <PublicationRow pub={pub} />
          </Reveal>
        ))}
      </EditorialSection>

      <EditorialSection id="experience" label="Research positions">
        {research.map((exp, i) => (
          <Reveal key={exp.company + exp.role} index={i}>
            <ExperienceRow exp={exp} />
          </Reveal>
        ))}
      </EditorialSection>

      {/* Tight band: these two groups are one idea in two parts. */}
      <EditorialSection label="Engineering &amp; leadership" className={styles.tightBand}>
        {engineering.map((exp, i) => (
          <Reveal key={exp.company + exp.role} index={i}>
            <ExperienceRow exp={exp} />
          </Reveal>
        ))}
      </EditorialSection>

      <EditorialSection id="projects" label="Selected work">
        <Reveal>
          <ProjectPlate project={plate} />
        </Reveal>
        {rest.map((project, i) => (
          <Reveal key={project.title} index={i}>
            <ProjectRow project={project} />
          </Reveal>
        ))}
      </EditorialSection>

      <EditorialSection label="Colophon" className={styles.tightBand}>
        {education.map((edu) => (
          <EducationRow key={edu.school} edu={edu} />
        ))}
        <ColophonRow label="Frontend">
          <p className={styles.colMono}>
            {skillsList.frontend.map((s) => s.name).join(", ")}
          </p>
        </ColophonRow>
        <ColophonRow label="Backend">
          <p className={styles.colMono}>
            {skillsList.backend.map((s) => s.name).join(", ")}
          </p>
        </ColophonRow>
        <ColophonRow label="Research">
          <p className={styles.colMono}>
            {skillsList.scientific.map((s) => s.name).join(", ")}
          </p>
        </ColophonRow>
      </EditorialSection>

      <Footer />
    </div>
  );
}
