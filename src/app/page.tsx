import styles from "./page.module.css";
import commonStyles from "@/components/Components.module.css";
import { resumeData } from "@/data/resumeData";
import { Container, Section, SectionHeading, ProjectCard, ExperienceCard, TechPill } from "@/components/Common";
import { Navbar } from "@/components/Navbar";
import { SocialLinks } from "@/components/SocialLinks";
import { FaCode, FaServer, FaFlask } from 'react-icons/fa';

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
              Software Engineer & Researcher based in Chicago / New York. <br />
              Developing scalable applications and biological research <br />
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
          <SectionHeading subtitle="Active developments in full-stack, AI, and community tools.">
            Projects
          </SectionHeading>
          <div className={commonStyles.projectGrid}>
            {resumeData.featuredProjects.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Experience Section */}
      <Section id="experience" className="animate delay-4">
        <Container>
          <SectionHeading subtitle="Professional impact in academic research and engineering leadership.">
            Experience
          </SectionHeading>
          <div className={commonStyles.experienceList}>
            {resumeData.experience.map((exp) => (
              <ExperienceCard key={exp.company + exp.role} exp={exp} />
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

