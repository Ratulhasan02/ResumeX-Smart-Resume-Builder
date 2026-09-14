/**
 * Central State Management for Resume Builder
 * Synchronizes in-memory state with localStorage and dispatches changes to listeners.
 */

const STORAGE_KEY = 'resume_builder_data_v1';

// Initial default blank state matching user data model
const defaultState = {
  personal: {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: ""
  },
  education: [
    { school: "", degree: "", year: "", grade: "" }
  ],
  experience: [
    { company: "", role: "", duration: "", description: "" }
  ],
  skills: [],
  projects: [
    { title: "", description: "", link: "" }
  ],
  achievements: [
    { title: "", description: "" }
  ],
  links: {
    linkedin: "",
    github: "",
    portfolio: ""
  },
  meta: {
    template: "template1",
    theme: "light",
    accentColor: "#4f46e5",
    sectionOrder: ["personal", "experience", "education", "skills", "projects", "achievements", "links"]
  }
};

// Rich sample data for quick preview and demonstrations
const sampleData = {
  personal: {
    name: "Alexander Morgan",
    title: "Senior Full Stack Engineer",
    email: "alex.morgan@example.com",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    summary: "Versatile Software Engineer with 6+ years of experience designing scalable distributed web platforms and high-throughput microservices. Passionate about clean architecture, performance optimization, and delightful developer experiences."
  },
  education: [
    {
      school: "University of California, Berkeley",
      degree: "B.S. in Computer Science",
      year: "2015 - 2019",
      grade: "3.88 / 4.0"
    }
  ],
  experience: [
    {
      company: "Stripe",
      role: "Senior Software Engineer",
      duration: "2022 - Present",
      description: "• Architected automated checkout routing pipelines that reduced global payment latency by 28% across 15M daily transactions.\n• Mentored 5 junior and mid-level engineers, leading team-wide adoption of strict TypeScript and automated end-to-end integration tests.\n• Collaborated with product and security leads to achieve zero-downtime PCI-DSS Level 1 compliance."
    },
    {
      company: "Vercel",
      role: "Software Engineer",
      duration: "2019 - 2022",
      description: "• Spearheaded the developer dashboard redesign, boosting real-time analytics query responsiveness by 40% using Edge Functions.\n• Authored open-source CLI utilities adopted by over 80,000 developers globally.\n• Streamlined CI/CD deployment pipelines, cutting average preview build times from 7 minutes to under 90 seconds."
    }
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Tailwind CSS",
    "Docker",
    "AWS",
    "GraphQL",
    "Redis",
    "System Design"
  ],
  projects: [
    {
      title: "DevPulse - Distributed Health Monitoring",
      description: "Engineered a real-time observability platform processing 50k metrics/sec with WebSocket dashboards, automated alerting, and anomaly detection algorithms.",
      link: "https://github.com/alexmorgan/devpulse"
    },
    {
      title: "FlowState - Minimalist Workflow Canvas",
      description: "Created an infinite-canvas node editor for system architects, featuring offline-first local state persistence and SVG diagram export.",
      link: "https://github.com/alexmorgan/flowstate"
    }
  ],
  achievements: [
    {
      title: "1st Place Winner - Global Hackathon 2023",
      description: "Awarded top honor among 450+ international engineering teams for building an AI-assisted accessible screen reader."
    },
    {
      title: "AWS Certified Solutions Architect (Professional)",
      description: "Validated advanced technical expertise in architecting highly resilient cloud solutions."
    }
  ],
  links: {
    linkedin: "https://linkedin.com/in/alexandermorgan",
    github: "https://github.com/alexmorgan",
    portfolio: "https://alexmorgan.dev"
  },
  meta: {
    template: "template1",
    theme: "light",
    accentColor: "#4f46e5",
    sectionOrder: ["personal", "experience", "education", "skills", "projects", "achievements", "links"]
  }
};

// Application state
export let resumeData = JSON.parse(JSON.stringify(defaultState));

// Subscribers list
const subscribers = [];

/**
 * Register a listener for state changes
 */
export function subscribe(callback) {
  if (typeof callback === 'function') {
    subscribers.push(callback);
  }
}

/**
 * Notify all subscribers
 */
function notifySubscribers() {
  subscribers.forEach(cb => {
    try {
      cb(resumeData);
    } catch (err) {
      console.error("Error in state subscriber:", err);
    }
  });
}

/**
 * Saves current state into localStorage and notifies subscribers
 */
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
  } catch (err) {
    console.warn("Unable to save state to localStorage:", err);
  }
  notifySubscribers();
}

/**
 * Loads state from localStorage
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaultState to ensure schema consistency
      resumeData = {
        ...defaultState,
        ...parsed,
        personal: { ...defaultState.personal, ...(parsed.personal || {}) },
        links: { ...defaultState.links, ...(parsed.links || {}) },
        meta: { ...defaultState.meta, ...(parsed.meta || {}) },
        education: Array.isArray(parsed.education) && parsed.education.length > 0 ? parsed.education : defaultState.education,
        experience: Array.isArray(parsed.experience) && parsed.experience.length > 0 ? parsed.experience : defaultState.experience,
        skills: Array.isArray(parsed.skills) ? parsed.skills : defaultState.skills,
        projects: Array.isArray(parsed.projects) ? parsed.projects : defaultState.projects,
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : defaultState.achievements
      };
    } else {
      resumeData = JSON.parse(JSON.stringify(defaultState));
    }
  } catch (err) {
    console.warn("Failed to load state from localStorage:", err);
    resumeData = JSON.parse(JSON.stringify(defaultState));
  }
  notifySubscribers();
  return resumeData;
}

/**
 * Populates state with sample data
 */
export function loadSampleState() {
  resumeData = JSON.parse(JSON.stringify(sampleData));
  saveState();
}

/**
 * Resets state to blank default
 */
export function resetState() {
  resumeData = JSON.parse(JSON.stringify(defaultState));
  saveState();
}

/**
 * Exports current resume state as a downloadable JSON file
 */
export function exportStateToJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resumeData, null, 2));
  const candidateName = (resumeData.personal?.name || 'resume').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const filename = `${candidateName}_data_backup.json`;

  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Imports resume state from parsed JSON content
 */
export function importStateFromJson(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Invalid JSON structure");
    }

    resumeData = {
      ...defaultState,
      ...parsed,
      personal: { ...defaultState.personal, ...(parsed.personal || {}) },
      links: { ...defaultState.links, ...(parsed.links || {}) },
      meta: { ...defaultState.meta, ...(parsed.meta || {}) },
      education: Array.isArray(parsed.education) ? parsed.education : defaultState.education,
      experience: Array.isArray(parsed.experience) ? parsed.experience : defaultState.experience,
      skills: Array.isArray(parsed.skills) ? parsed.skills : defaultState.skills,
      projects: Array.isArray(parsed.projects) ? parsed.projects : defaultState.projects,
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : defaultState.achievements
    };

    saveState();
    return true;
  } catch (err) {
    console.error("Failed to import resume JSON:", err);
    return false;
  }
}

