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

export interface Education {
  school: string;
  location: string;
  degree: string;
  period: string;
  details?: string[];
}

export interface Publication {
  authors: string;
  year: string;
  title: string;
  venue: string;
  type: string;
  link?: string;
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
      degree: "B.S. Computer Science & Mathematics",
      period: "Expected May 2030",
      details: []
    },
    {
      school: "Great Neck South High School",
      location: "Great Neck, NY",
      degree: "High School Diploma",
      period: "June 2026",
      details: [
        "GPA 96.7 / 100 (unweighted) · SAT 1540 / 1600",
        "AP Physics C, AP Calculus BC, AP Computer Science, AP English Literature, AP Spanish, AP Economics, Senior Seminar Research Honors."
      ]
    }
  ] as Education[],

  featuredProjects: [
    {
      title: "ReSource",
      description: "AI-powered marketplace that helps users donate, resell, or recycle unwanted items with AI image recognition and community mapping.",
      impact: "Built as a full-stack Next.js app with PostgreSQL and Supabase, integrating Gemini API and Mapbox for real-time item recognition and location.",
      technologies: ["Next.js", "TypeScript", "Gemini API", "Mapbox", "PostgreSQL", "Supabase"],
      link: "https://devpost.com/software/resource-i3nq1y",
      image: "/images/resource.png",
      featured: true
    },
    {
      title: "SATsaurus",
      description: "Gamified SAT-prep platform delivering free, interactive practice to 1000+ students worldwide.",
      technologies: ["Next.js", "Supabase", "SQL", "TailwindCSS"],
      featured: true
    },
    {
      title: "GNS Web Development Club",
      description: "Co-founded and led a 70+ member community that built and maintained 20+ websites for nonprofits, churches, businesses, and school clubs.",
      technologies: ["React.js", "Next.js", "TypeScript", "Supabase"],
      link: "https://gnswebdev.club/projects",
      featured: true
    },
    {
      title: "Force Network",
      description: "High-performance hosting hub for 100+ Minecraft servers and deployment solutions, serving secure nodes and bandwidth to 800+ users.",
      impact: "Designed to accelerate development work and eliminate deployment toil through fast, secure infrastructure.",
      technologies: ["Node.js", "Docker", "MongoDB", "Pterodactyl"],
      link: "https://forcenetwork.cloud",
      featured: true
    }
  ],

  publications: [
    {
      authors: "Liu, H., Ammanamanchi, N., Mich-Basso, J., Panama, B., Li, Y., Huang, W., Almeida, D., Lewarchik, C., Lo, B., Wu, Y., Gotthardt, M., Kotlikoff, M., Baehr, W., Rasmusson, R., Salama, G., & Kühn, B.",
      year: "2026",
      title: "Sequential changes in calcium transients during M phase regulate cardiomyocyte proliferation.",
      venue: "Journal of Cell Biology",
      type: "Journal Article",
      link: "https://doi.org/10.1083/jcb.202505134"
    },
    {
      authors: "Cheng, B., Jin, A., Zhang, J., Pemmaraju, A., Lo, B., & Chang, J.",
      year: "2026",
      title: "A horizon-dependent intrinsic-dimension theory of scaling for biological forecasting.",
      venue: "HiLD Workshop, International Conference on Machine Learning (ICML)",
      type: "Poster",
      link: "https://openreview.net/forum?id=1ZFyQRalEc"
    },
    {
      authors: "Cheng, B., Jin, A., Zhang, J., Lo, B., Pemmaraju, A., & Chang, J.",
      year: "2026",
      title: "ERVNet: A three-module framework for predicting endogenous retrovirus reactivation, gene propagation, and immunogenicity.",
      venue: "FM4LS Workshop, International Conference on Machine Learning (ICML)",
      type: "Poster",
      link: "https://openreview.net/forum?id=kbn0sqjGFv"
    },
    {
      authors: "Cheng, B., Jin, A., Zhang, J., Pemmaraju, A., Chang, J., & Lo, B.",
      year: "2026",
      title: "PROTEUS: Predicting how post-translational modifications alter drug binding affinity.",
      venue: "FM4LS Workshop, International Conference on Machine Learning (ICML)",
      type: "Poster",
      link: "https://openreview.net/forum?id=wZVHPYvc65"
    }
  ] as Publication[],

  experience: [
    {
      company: "Columbia University",
      role: "Summer Research Intern — Blumberg Lab",
      location: "New York, NY",
      period: "Summer 2026",
      description: [
        "Applying Topological Data Analysis (TDA) to RNA-Seq annotation."
      ]
    },
    {
      company: "New York University",
      role: "Summer Research Intern — Shasha Lab",
      location: "New York, NY",
      period: "Summer 2026",
      description: [
        "Building an agentic AI workflow for a calorie-tracking application."
      ]
    },
    {
      company: "Weill Cornell Medical College",
      role: "Pediatrics Summer Research Intern — Heart Regeneration (Kühn & Liu Lab)",
      location: "New York, NY",
      period: "Summer 2025",
      description: [
        "Ran data analyses with Python, Fiji/ImageJ, and VBA to uncover calcium's role in cardiomyocyte proliferation.",
        "Co-authored the resulting paper, published in the Journal of Cell Biology."
      ]
    },
    {
      company: "Weill Cornell Medical College",
      role: "Summer Research Intern — Epigenetics of Congenital Heart Disease (Long Lab)",
      location: "New York, NY",
      period: "Summer 2024",
      description: [
        "Performed PCR, Western blot, cloning, and RNA-seq analyses in R and Python to identify genes regulated by JARID2.",
        "Investigated the role of the PRC2 complex in heart development and congenital heart disease."
      ]
    },
    {
      company: "Web Development Club",
      role: "Co-President / Co-Founder",
      location: "Great Neck, NY",
      period: "Oct 2024 - Present",
      description: [
        "Recruited and led full-stack projects with 70+ members using JavaScript, TypeScript, React.js, Supabase, and SQL.",
        "Built and maintained 20+ websites for nonprofits, churches, businesses, and school clubs."
      ]
    },
    {
      company: "Kudos Connect",
      role: "Chief Technology Officer / Head of Newsletter",
      location: "Great Neck, NY",
      period: "Jan 2024 - Present",
      description: [
        "Led 15+ people to build the website and newsletter, growing a following of 7000+ students for volunteer opportunities."
      ]
    },
    {
      company: "Programming Club",
      role: "Board Member / App Leader",
      location: "Great Neck, NY",
      period: "Jan 2024 - Present",
      description: [
        "Taught 20+ students to code in AI/ML, Python, and Java.",
        "Led 10+ students to build a school app for 1300+ students using Swift."
      ]
    },
    {
      company: "FIRST Robotics Team 2638",
      role: "Head Webmaster / Lead Programmer",
      location: "Great Neck, NY",
      period: "Sep 2024 - Present",
      description: [
        "Coded trajectory-generation algorithms and robot control, competing at the FIRST Robotics World Championship (2025)."
      ]
    },
    {
      company: "PRC2 Drug Discovery Project",
      role: "Independent Researcher",
      location: "New York, NY",
      period: "Sep 2024 - Sep 2025",
      description: [
        "Ran ML-based (Random Forest, Python, Schrödinger Maestro) virtual screening and GROMACS molecular dynamics simulations.",
        "Repurposed drugs to inhibit the PRC2 protein complex as a target for cancer and congenital heart disease."
      ]
    }
  ],

  skillsList: {
    frontend: [
      { name: "Next.js", color: "#000000" },
      { name: "React.js", color: "#61DAFB" },
      { name: "TypeScript", color: "#3178C6" },
      { name: "JavaScript", color: "#F7DF1E" },
      { name: "HTML/CSS", color: "#E34F26" },
      { name: "TailwindCSS", color: "#06B6D4" },
      { name: "Swift", color: "#F05138" }
    ],
    backend: [
      { name: "Python", color: "#3776AB" },
      { name: "Java", color: "#007396" },
      { name: "C#", color: "#239120" },
      { name: "SQL", color: "#4479A1" },
      { name: "Node.js", color: "#339933" },
      { name: "Express.js", color: "#339933" },
      { name: "Supabase", color: "#3ECF8E" },
      { name: "MongoDB", color: "#47A248" },
      { name: "Gemini API", color: "#4285F4" }
    ],
    scientific: [
      { name: "R", color: "#276DC3" },
      { name: "AI/ML", color: "#2196F3" },
      { name: "RNA-seq Analysis", color: "#E91E63" },
      { name: "Molecular Docking", color: "#FF5722" },
      { name: "Molecular Dynamics", color: "#2196F3" },
      { name: "GROMACS", color: "#2196F3" },
      { name: "Fiji/ImageJ", color: "#000000" },
      { name: "VBA", color: "#2E7D32" }
    ]
  }
};
