import styles from "./page.module.css";
import commonStyles from "@/components/Components.module.css";
import { resumeData } from "@/data/resumeData";
import { Container, Section, SectionHeading, ProjectCard, ExperienceCard, EducationCard, PublicationCard, TechPill } from "@/components/Common";
import { SocialLinks } from "@/components/SocialLinks";
import { HeroName } from "@/components/HeroName";
import { HeroStage } from "@/components/HeroStage";
import { HeroActions } from "@/components/HeroActions";
import { StatBand } from "@/components/StatBand";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { TiltCard } from "@/components/TiltCard";
import { FaCode, FaServer, FaFlask } from 'react-icons/fa';

export default function Home() {
  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <Section id="about">
        <Container>
          <div className={styles.heroCenter}>
            <HeroStage>
              <Reveal delay={120} direction="scale">
                <span className={styles.statusPill}>
                  <span className={styles.statusDot} />
                  Available for internships · CS + Math @ UChicago
                </span>
              </Reveal>
              <HeroName text={resumeData.name} />
              <Reveal delay={650}>
                <p className={styles.heroDescription}>
                  Software Engineer & Researcher studying Computer Science & Mathematics at UChicago. <br />
                  Building scalable full-stack applications and advancing computational research <br />
                  at the intersection of technology and science.
                </p>
              </Reveal>
              <Reveal delay={780}>
                <HeroActions />
              </Reveal>
              <Reveal delay={880} direction="scale">
                <SocialLinks />
              </Reveal>
            </HeroStage>
          </div>
        </Container>
      </Section>

      {/* Impact Stats */}
      <Section id="impact" className={styles.statSection}>
        <Container>
          <Reveal>
            <StatBand />
          </Reveal>
        </Container>
      </Section>

      {/* Tech Stack Section */}
      <Section id="skills">
        <Container>
          <div className={styles.skillsContainer}>
            {[
              { icon: <FaCode />, name: "Frontend", list: resumeData.skillsList.frontend },
              { icon: <FaServer />, name: "Backend", list: resumeData.skillsList.backend },
              { icon: <FaFlask />, name: "Research & Science", list: resumeData.skillsList.scientific },
            ].map((group, gi) => (
              <Reveal key={group.name} delay={gi * 90} direction="depth" className={styles.skillCard}>
                <div className={styles.skillCardHead}>
                  <span className={styles.skillIcon}>{group.icon}</span>
                  <h3 className={styles.skillGroupTitle}>{group.name}</h3>
                  <span className={styles.skillCount}>{group.list.length}</span>
                </div>
                <div className={styles.pillCloud}>
                  {group.list.map((skill, si) => (
                    <span
                      key={skill.name}
                      className="pillReveal"
                      style={{ animationDelay: `${gi * 90 + si * 45}ms` }}
                    >
                      <TechPill name={skill.name} />
                    </span>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Projects Section */}
      <Section id="projects">
        <Container>
          <Reveal>
            <SectionHeading index="01" subtitle="Active work across full-stack, AI, and community tools.">
              Projects
            </SectionHeading>
          </Reveal>
          <div className={commonStyles.projectGrid}>
            {resumeData.featuredProjects.map((project, i) => {
              const large = Boolean(project.image);
              return (
                <Reveal
                  key={project.title}
                  delay={(i % 2) * 90}
                  direction="depth"
                  className={large ? commonStyles.bentoLarge : ""}
                >
                  <TiltCard max={large ? 4 : 7}>
                    <ProjectCard project={project} featured={large} />
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* Publications Section */}
      <Section id="publications">
        <Container>
          <Reveal>
            <SectionHeading index="02" subtitle="Peer-reviewed research in machine learning and cell biology.">
              Publications
            </SectionHeading>
          </Reveal>
          <div className={commonStyles.pubList}>
            {resumeData.publications.map((pub, i) => (
              <Reveal key={pub.title} delay={i * 70} direction="depth">
                <TiltCard radius={16} max={4}>
                  <PublicationCard pub={pub} />
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Experience Section */}
      <Section id="experience">
        <Container>
          <Reveal>
            <SectionHeading index="03" subtitle="Research internships and engineering leadership.">
              Experience
            </SectionHeading>
          </Reveal>
          <div className={commonStyles.experienceList}>
            {resumeData.experience.map((exp, i) => (
              <Reveal key={exp.company + exp.role} delay={i * 40} direction="left">
                <ExperienceCard exp={exp} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Education Section */}
      <Section id="education">
        <Container>
          <Reveal>
            <SectionHeading index="04" subtitle="Academic background and coursework.">
              Education
            </SectionHeading>
          </Reveal>
          <div className={commonStyles.eduList}>
            {resumeData.education.map((edu, i) => (
              <Reveal key={edu.school} delay={i * 60} direction="left">
                <EducationCard edu={edu} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
