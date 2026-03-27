import styles from "./page.module.css";
import { resumeData } from "@/data/resumeData";
import { Container, Section, SectionHeading, ProjectCard, ExperienceCard } from "@/components/Common";
import { Marquee } from "@/components/Marquee";
import { ArrowUpRight } from "lucide-react";

export default function Home() {
  return (
    <div className={styles.main}>
      {/* Bio / Hero */}
      <Container>
        <div className={`${styles.hero} animate delay-1`}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Brendan <strong>Lo</strong>
            </h1>
            <p className={styles.heroSubtitle}>
              Software Engineer & Researcher based in Chicago / New York. <br />
              Developing scalable applications and biological research at the intersection of technology and science.
            </p>
          </div>
        </div>
      </Container>

      {/* Marquee Section - Top of the fold */}
      <Section id="skills" className="animate delay-2">
        <Marquee items={resumeData.skillsList.frontend} />
        <Marquee items={resumeData.skillsList.backend} direction="right" />
      </Section>

      {/* Projects Section - Condensed List */}
      <Section id="projects" className="animate delay-3">
        <Container>
          <SectionHeading subtitle="Active developments in full-stack, AI, and community tools.">
            Projects
          </SectionHeading>
          <div className={styles.projectList}>
            {resumeData.featuredProjects.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Experience Section - Condensed List */}
      <Section id="experience" className="animate delay-4">
        <Container>
          <SectionHeading subtitle="Professional impact in academic research and engineering leadership.">
            Experience
          </SectionHeading>
          <div className={styles.experienceList}>
            {resumeData.experience.map((exp) => (
              <ExperienceCard key={exp.company + exp.role} exp={exp} />
            ))}
          </div>
        </Container>
      </Section>

      {/* Scientific Tools Marquee */}
      <Section className="animate delay-4">
        <Marquee title="Research & Science Stack" items={resumeData.skillsList.scientific} />
      </Section>

      {/* Footer */}
      <footer className={styles.footer}>
        <Container>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} Brendan Lo. 
          </p>
          <a href={`mailto:${resumeData.email}`} className={styles.footerContact}>
            Get in Touch <ArrowUpRight size={14} style={{ display: 'inline', marginLeft: '4px' }} />
          </a>
        </Container>
      </footer>
    </div>
  );
}
