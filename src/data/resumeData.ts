export interface Project {
  title: string;
  description: string;
  technologies: string[];
  link?: string;
  impact?: string;
  featured?: boolean;
  image?: string;
}

export interface Skill {
  name: string;
  color: string;
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
      description: "Gamified SAT prep platform providing free, interactive learning resources for 1000+ underprivileged students globally.",
      technologies: ["Next.js", "Supabase", "SQL", "TailwindCSS"],
      featured: true
    },
    {
      title: "GNS Web Development Club",
      description: "Co-founded and led a community of 70+ developers building real-world solutions. Built & maintained 20+ websites for nonprofits, churches, businesses, and school clubs.",
      technologies: ["React.js", "Next.js", "JavaScript", "HTML/CSS"],
      link: "https://www.gnswebdev.club/projects",
      featured: true
    },
    {
      title: "Force Network",
      description: "A high-performance hosting hub for 100+ Minecraft servers and general deployment solutions, offering secure nodes and unlimited bandwidth for 800+ users.",
      impact: "Designed specifically to accelerate development work and eliminate deployment toil through secure, fast infrastructure.",
      technologies: ["Node.js", "Docker", "MongoDB", "Pterodactyl"],
      link: "https://forcenetwork.cloud",
      featured: true
    }
  ],


  experience: [

    {
      company: "Programming Club",
      role: "Software and App Lead",
      location: "Great Neck, NY",
      period: "Jan 2024 - Present",
      description: [
        "Taught 20+ students to code in AI/ML, Python & Java.",
        "Leading 10+ students to build a school app for 1300+ students with calendars, guides, and positive notes using Swift."
      ]
    },
    {
      company: "Weill Cornell Medical College",
      role: "Research & Data Analysis Intern",
      location: "New York, NY",
      period: "Summer 2025",
      description: [
        "Ran data analyses using Python, Fiji/ImageJ, and VBA Macros to discover calcium's role in heart cell proliferation.",
        "Co-author of a paper under review at the Journal of Cell Biology: Liu, H., Ammanamanchi, N., Mich-Basso, J., Panama, B., Li, Y., Huang, W., Almeida, D., Lewarchik, C. M., Lo, B., Wu, Y., Gotthardt, M., Kotlikoff, M., Baehr, W., Rasmusson, R., Salama, G., & Kühn, B. (2026). Cardiomyocytes change calcium signaling for cell division."
      ]
    },
    {
      company: "Kudos Connect",
      role: "Chief Technology Officer / Newsletter Head",
      location: "Great Neck, NY",
      period: "Jan 2024 - Present",
      description: [
        "Led 15+ people to create newsletters, building a following of 7000+ high school students for research & volunteer opportunities.",
        "Managed a technology team of 5+ to maintan database and website"
      ]
    },
    {
      company: "FIRST Robotics Team 2638",
      role: "Head Webmaster / Build Team",
      location: "Great Neck, NY",
      period: "Sep 2024 - Present",
      description: [
        "Mentored 20+ K-8 students and global teams.",
        "Built website & robot, competing in FIRST Robotics Competition World Championship 2025"
      ]
    },
    {
      company: "Science Research Project (2024-25)",
      role: "Independent Science Researcher",
      location: "Great Neck, NY",
      period: "2024 - 2025",
      description: [
        "Conducted Machine Learning-based virtual screening and molecular dynamics simulations to repurpose drugs for the inhibition of PRC2 protein complex.",
        "Trained & validated a random forest machine learning model for ligand-based virtual screening.",
        "Used the Schrödinger Maestro software to run structure-based virtual screening.",
        "Validated virtual screened drugs using GROMACS molecular dynamics simulations."
      ]
    },
    {
      company: "Boy Scouts of America",
      role: "Service Project Coordinator / Patrol Leader / Den Chief / Bugler",
      location: "Great Neck, NY",
      period: "Jan 2018 - Present",
      description: [
        "Led 70+ scouts on camping trips and flag ceremonies.",
        "Coordinated service projects for museums, autistic kids, the homeless, and the environment."
      ]
    },
    {
      company: "Eagle Scout Project",
      role: "Project Director and Museum Curator",
      location: "Great Neck, NY",
      period: "Sep 2022 - Jan 2024",
      description: [
        "Fundraised $1500+, leading 30+ scouts to create a museum exhibit about WWII in the US Merchant Marine Museum"
      ]
    }
  ],

  skillsList: {
    frontend: [
      { name: "Next.js", color: "#000000" },
      { name: "React.js", color: "#61DAFB" },
      { name: "TypeScript", color: "#3178C6" },
      { name: "JavaScript", color: "#F7DF1E" },
      { name: "HTML5", color: "#E34F26" },
      { name: "TailwindCSS", color: "#06B6D4" },
      { name: "Swift", color: "#F05138" },
      { name: "Django", color: "#06B6D4" }
    ],
    backend: [
      { name: "Python", color: "#3776AB" },
      { name: "Java", color: "#007396" },
      { name: "C#", color: "#239120" },
      { name: "SQL", color: "#4479A1" },
      { name: "Supabase", color: "#3ECF8E" },
      { name: "Node.js", color: "#339933" },
      { name: "Express.js", color: "#339933" },
      { name: "MongoDB", color: "#339933" },
      { name: "Firebase", color: "#339933" }
    ],
    scientific: [
      { name: "R", color: "#276DC3" },
      { name: "Fiji/ImageJ", color: "#000000" },
      { name: "VBA", color: "#2E7D32" },
      { name: "RNA-seq", color: "#E91E63" },
      { name: "Molecular Docking", color: "#FF5722" },
      { name: "GROMACS", color: "#2196F3" },
      { name: "Matlab", color: "#2196F3" },
      { name: "AI/ML", color: "#2196F3" }
    ]
  }
};
