import styles from "./page.module.css";
import commonStyles from "@/components/Components.module.css";
import { resumeData } from "@/data/resumeData";
import { Container, Section, SectionHeading, ProjectCard, ExperienceCard, EducationCard, PublicationCard, TechPill } from "@/components/Common";
import { Navbar } from "@/components/Navbar";
import { SocialLinks } from "@/components/SocialLinks";
import { FaCode, FaServer, FaFlask } from 'react-icons/fa';
import { Award } from 'lucide-react';

export default function Home() {
  return (
    <div className={styles.main}>
      <Navbar />

      {/* Hero Section */}
      <Section id="about" className="animate delay-1">
        <Container>
          <div className={styles.heroCenter}>
            <h1 className={styles.heroName}>{resumeData.name}</h1>
            <p className={styles.heroDescription}>
              Software Engineer & Researcher studying Computer Science & Mathematics at UChicago. <br />
              Building scalable full-stack applications and advancing computational research <br />
              at the intersection of technology and science.
            </p>
            <SocialLinks />
          </div>
        </Container>
      </Section>

      {/* Tech Stack Section */}
      <Section id="skills" className="animate delay-2">
        <Container>
          <div className={styles.skillsContainer}>
            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}><FaCode /> Frontend</h3>
              <div className={styles.pillCloud}>
                {resumeData.skillsList.frontend.map(skill => (
                  <TechPill key={skill.name} name={skill.name} />
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}><FaServer /> Backend</h3>
              <div className={styles.pillCloud}>
                {resumeData.skillsList.backend.map(skill => (
                  <TechPill key={skill.name} name={skill.name} />
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}><FaFlask /> Research & Science</h3>
              <div className={styles.pillCloud}>
                {resumeData.skillsList.scientific.map(skill => (
                  <TechPill key={skill.name} name={skill.name} />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Projects Section */}
      <Section id="projects" className="animate delay-3">
        <Container>
          <SectionHeading subtitle="Active work across full-stack, AI, and community tools.">
            Projects
          </SectionHeading>
          <div className={commonStyles.projectGrid}>
            {resumeData.featuredProjects.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Publications Section */}
      <Section id="publications" className="animate delay-3">
        <Container>
          <SectionHeading subtitle="Peer-reviewed research in machine learning and cell biology.">
            Publications
          </SectionHeading>
          <div className={commonStyles.pubList}>
            {resumeData.publications.map((pub) => (
              <PublicationCard key={pub.title} pub={pub} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Experience Section */}
      <Section id="experience" className="animate delay-4">
        <Container>
          <SectionHeading subtitle="Research internships and engineering leadership.">
            Experience
          </SectionHeading>
          <div className={commonStyles.experienceList}>
            {resumeData.experience.map((exp) => (
              <ExperienceCard key={exp.company + exp.role} exp={exp} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Education Section */}
      <Section id="education" className="animate delay-4">
        <Container>
          <SectionHeading subtitle="Academic background and coursework.">
            Education
          </SectionHeading>
          <div className={commonStyles.eduList}>
            {resumeData.education.map((edu) => (
              <EducationCard key={edu.school} edu={edu} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Honors Section */}
      <Section id="honors" className="animate delay-4">
        <Container>
          <SectionHeading subtitle="Recognition across research, engineering, and service.">
            Honors & Awards
          </SectionHeading>
          <div className={commonStyles.honorsGrid}>
            {resumeData.honors.map((honor) => (
              <div key={honor} className={commonStyles.honorItem}>
                <Award size={18} className={commonStyles.honorIcon} />
                {honor}
              </div>
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
