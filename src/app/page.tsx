import Image from "next/image";
import styles from "./page.module.css";
import { resumeData } from "@/data/resumeData";
import { Container, Section, SectionHeading, ProjectCard, ExperienceCard } from "@/components/Common";

export default function Home() {
  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <Container>
        <div className={`${styles.hero} animate delay-1`}>
          <div className={styles.heroContent}>
            <span className={styles.badge}>Available for Work</span>
            <h1 className={styles.heroTitle}>
              Brendan <strong>Lo</strong>
            </h1>
            <p className={styles.heroSubtitle}>
              Software Engineer & Researcher at the intersection of Computer Science and Bioengineering. 
              Currently studying at the University of Chicago.
            </p>
          </div>
        </div>
      </Container>

      {/* Projects Section */}
      <Section id="projects" className="animate delay-2">
        <Container>
          <SectionHeading subtitle="Impactful software solutions built with modern technology stacks.">
            Featured Projects
          </SectionHeading>
          <div className={styles.projectGrid}>
            {resumeData.featuredProjects.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Experience Section */}
      <Section id="experience" className="animate delay-3">
        <Container>
          <SectionHeading subtitle="Professional research and leadership roles in medical science and technology.">
            Relevant Experience
          </SectionHeading>
          <div className={styles.experienceList}>
            {resumeData.experience.map((exp) => (
              <ExperienceCard key={exp.company + exp.role} exp={exp} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Skills & Education */}
      <Section id="skills" className="animate delay-4">
        <Container>
          <SectionHeading subtitle="A comprehensive look at my technical and scientific toolkit.">
            Skills & Education
          </SectionHeading>
          
          <div className={styles.skillsGrid}>
            <div className={styles.skillCategory}>
              <h3>Software</h3>
              <ul className={styles.skillList}>
                {resumeData.skills.programming.map(skill => (
                  <li key={skill} className={styles.skillItem}>{skill}</li>
                ))}
              </ul>
            </div>
            <div className={styles.skillCategory}>
              <h3>Tools</h3>
              <ul className={styles.skillList}>
                {resumeData.skills.tools.map(skill => (
                  <li key={skill} className={styles.skillItem}>{skill}</li>
                ))}
              </ul>
            </div>
            <div className={styles.skillCategory}>
              <h3>Science</h3>
              <ul className={styles.skillList}>
                {resumeData.skills.scientific.map(skill => (
                  <li key={skill} className={styles.skillItem}>{skill}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles.educationSection}>
            {resumeData.education.map((edu) => (
              <div key={edu.school} className={styles.eduItem}>
                <div className={styles.eduHeader}>
                  <h4 className={styles.eduSchool}>{edu.school}</h4>
                  <span className={styles.eduPeriod}>{edu.expected}</span>
                </div>
                <div className={styles.eduMeta}>
                  <span>{edu.major || edu.details}</span>
                  <span>{edu.location}</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Footer */}
      <footer className={styles.footer}>
        <Container>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} Brendan Lo. Built with Next.js.
          </p>
          <a href={`mailto:${resumeData.email}`} className={styles.footerContact}>
            {resumeData.email}
          </a>
        </Container>
      </footer>
    </div>
  );
}
