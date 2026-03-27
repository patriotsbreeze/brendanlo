export interface Project {
  title: string;
  description: string;
  technologies: string[];
  link?: string;
  impact?: string;
  featured?: boolean;
  image?: string;
}

export interface Experience {
  company: string;
  role: string;
  location: string;
  period: string;
  description: string[];
  impactTitle?: string;
}

export const resumeData = {
  name: "Brendan Lo",
  title: "Software Engineer & Researcher",
  email: "brendanlo@uchicago.edu",
  phone: "516-373-8335",
  socials: {
    github: "https://github.com/patriotsbreeze",
    linkedin: "https://www.linkedin.com/in/brendan-lo-8b0b80247/",
    instagram: "https://www.instagram.com/brendanloalt/"
  },
  education: [
    {
      school: "University of Chicago",
      location: "Chicago, IL",
      major: "Computer Science & Bioengineering",
      expected: "May 2030",
      details: "Incoming Freshman"
    },
    {
      school: "Great Neck South High School",
      location: "Great Neck, NY",
      expected: "June 2026",
      details: "GPA: 96.7/100 | SAT: 1540/1600"
    }
  ],
  featuredProjects: [
    {
      title: "ReSource",
      description: "AI-powered web application for circular economy, helping users identify, donate, or recycle unwanted items using Gemini AI and Mapbox.",
      impact: "Built as a full-stack Next.js app with PostgreSQL and Supabase. Features real-time mapping and AI image recognition.",
      technologies: ["Next.js", "TypeScript", "Gemini API", "Mapbox", "PostgreSQL", "Supabase"],
      link: "https://devpost.com/software/resource-i3nq1y",
      image: "/images/resource.png",
      featured: true
    },
    {
      title: "SATsaurus",
      description: "Gamified SAT prep platform providing free, interactive learning resources for underprivileged students globally.",
      impact: "Led a team of 5+ to build a scalable platform serving over 1000 students.",
      technologies: ["Next.js", "Supabase", "SQL", "TailwindCSS"],
      featured: true
    },
    {
      title: "GNS Web Development Club",
      description: "Co-founded and led a community of 70+ developers building real-world solutions.",
      impact: "Maintained 20+ websites for local nonprofits, businesses, and clubs.",
      technologies: ["React.js", "Next.js", "JavaScript", "HTML/CSS"],
      link: "https://www.gnswebdev.club",
      featured: true
    }
  ],
  experience: [
    {
      company: "Weill Cornell Medical College",
      role: "Pediatrics Summer Research Intern-Heart Regeneration",
      location: "New York, NY",
      period: "Summer 2025",
      description: [
        "Analyzed calcium's role in heart cell proliferation using Python, Fiji/ImageJ, and VBA Macros.",
        "Co-authored a paper under review at the Journal of Cell Biology."
      ]
    },
    {
      company: "Kudos Connect",
      role: "Chief Technology Officer",
      location: "Great Neck, NY",
      period: "January 2024 - Present",
      description: [
        "Led a team of 15+ to develop a platform reaching 7000+ students for research and volunteer opportunities."
      ]
    },
    {
      company: "First Robotics Team 2638",
      role: "Head Webmaster",
      location: "Great Neck, NY",
      period: "September 2024 - Present",
      description: [
        "Led web development and mentored students, leading to the FIRST Robotics World Championship 2025."
      ]
    }
  ],
  skills: {
    frontend: ["Next.js", "React.js", "TypeScript", "JavaScript", "HTML", "CSS", "TailwindCSS", "Swift"],
    backend: ["Python", "Java", "C#", "SQL", "PostgreSQL", "Supabase", "Node.js"],
    scientific: ["R", "Fiji/ImageJ", "VBA Macros", "RNA-seq Analysis", "Molecular Docking", "GROMACS"]
  }
};
