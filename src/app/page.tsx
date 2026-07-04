import styles from "./page.module.css";
import commonStyles from "@/components/Components.module.css";
import { resumeData } from "@/data/resumeData";
import { Container, Section, SectionHeading, ProjectCard, ExperienceCard, EducationCard, PublicationCard, TechPill } from "@/components/Common";
import { SocialLinks } from "@/components/SocialLinks";
import { HeroName } from "@/components/HeroName";
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
            <HeroName text={resumeData.name} />
            <Reveal delay={650}>
              <p className={styles.heroDescription}>
                Software Engineer & Researcher studying Computer Science & Mathematics at UChicago. <br />
                Building scalable full-stack applications and advancing computational research <br />
                at the intersection of technology and science.
              </p>
            </Reveal>
            <Reveal delay={800} direction="scale">
              <SocialLinks />
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Tech Stack Section */}
      <Section id="skills">
        <Container>
          <div className={styles.skillsContainer}>
            {[
              { title: <><FaCode /> Frontend</>, list: resumeData.skillsList.frontend },
              { title: <><FaServer /> Backend</>, list: resumeData.skillsList.backend },
              { title: <><FaFlask /> Research & Science</>, list: resumeData.skillsList.scientific },
            ].map((group, gi) => (
              <Reveal key={gi} delay={gi * 80} className={styles.skillGroup}>
                <h3 className={styles.skillGroupTitle}>{group.title}</h3>
                <div className={styles.pillCloud}>
                  {group.list.map((skill, si) => (
                    <span
                      key={skill.name}
                      className={styles.pillReveal}
                      style={{ animationDelay: `${gi * 80 + si * 40}ms` }}
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
            <SectionHeading subtitle="Active work across full-stack, AI, and community tools.">
              Projects
            </SectionHeading>
          </Reveal>
          <div className={commonStyles.projectGrid}>
            {resumeData.featuredProjects.map((project, i) => (
              <Reveal key={project.title} delay={(i % 2) * 90} direction="up">
                <TiltCard>
                  <ProjectCard project={project} />
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Publications Section */}
      <Section id="publications">
        <Container>
          <Reveal>
            <SectionHeading subtitle="Peer-reviewed research in machine learning and cell biology.">
              Publications
            </SectionHeading>
          </Reveal>
          <div className={commonStyles.pubList}>
            {resumeData.publications.map((pub, i) => (
              <Reveal key={pub.title} delay={i * 70}>
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
            <SectionHeading subtitle="Research internships and engineering leadership.">
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
            <SectionHeading subtitle="Academic background and coursework.">
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
      <footer className={styles.footer}>
        <Container>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} Brendan Lo.
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.5, marginTop: '8px' }}>
            Built with Next.js & React
          </p>
        </Container>
      </footer>
    </div>
  );
}
