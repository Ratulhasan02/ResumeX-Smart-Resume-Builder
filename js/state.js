import { templates } from './templates.js';

/**
 * Central State Management for Resume Builder
 * Synchronizes in-memory state with localStorage and dispatches changes to listeners.
 */

const LEGACY_STORAGE_KEY = 'resume_builder_data_v1';
const PROFILES_INDEX_KEY = 'resume_builder_profiles_index';
const PROFILE_DATA_KEY_PREFIX = 'resume_builder_data_';
const KNOWN_SECTIONS = ['personal', 'experience', 'education', 'skills', 'projects', 'achievements', 'links'];
const MAX_IMPORT_ITEMS = 50;
const MAX_FIELD_LENGTH = 5000;

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
    accentColor: "#4f46e5",
    sectionOrder: ["personal", "experience", "education", "skills", "projects", "achievements", "links"],
    jobDescription: "",
    atsScoreHistory: []
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
    accentColor: "#4f46e5",
    sectionOrder: ["personal", "experience", "education", "skills", "projects", "achievements", "links"],
    jobDescription: "",
    atsScoreHistory: []
  }
};

// Application state
export let resumeData = JSON.parse(JSON.stringify(defaultState));
let profileRegistry = null;

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

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function createProfileId() {
  return `profile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function boundedString(value) {
  return typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH) : '';
}

function normalizeItems(value, fields, fallback) {
  if (!Array.isArray(value) || value.length === 0) return cloneState(fallback);
  return value.slice(0, MAX_IMPORT_ITEMS).map(item => {
    const normalized = {};
    fields.forEach(field => {
      normalized[field] = boundedString(item && typeof item === 'object' ? item[field] : '');
    });
    return normalized;
  });
}

function normalizeState(parsed) {
  const source = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  const meta = source.meta && typeof source.meta === 'object' ? source.meta : {};
  const sectionOrder = ['personal', ...new Set((Array.isArray(meta.sectionOrder) ? meta.sectionOrder : [])
    .filter(key => KNOWN_SECTIONS.includes(key) && key !== 'personal'))];
  KNOWN_SECTIONS.filter(key => key !== 'personal').forEach(key => {
    if (!sectionOrder.includes(key)) sectionOrder.push(key);
  });

  return {
    ...cloneState(defaultState),
    personal: Object.fromEntries(Object.keys(defaultState.personal).map(field => [field, boundedString(source.personal?.[field])])),
    links: Object.fromEntries(Object.keys(defaultState.links).map(field => [field, boundedString(source.links?.[field])])),
    meta: {
      template: Object.hasOwn(templates, meta.template) ? meta.template : defaultState.meta.template,
      accentColor: typeof meta.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(meta.accentColor)
        ? meta.accentColor
        : defaultState.meta.accentColor,
      sectionOrder,
      jobDescription: boundedString(meta.jobDescription),
      atsScoreHistory: Array.isArray(meta.atsScoreHistory)
        ? meta.atsScoreHistory.filter(entry => entry && (entry.type === 'ats' || entry.type === 'job') && Number.isFinite(entry.score) && typeof entry.timestamp === 'string' && Number.isFinite(Date.parse(entry.timestamp))).slice(-5)
          .map(entry => ({
            type: entry.type,
            score: Math.max(0, Math.min(100, Math.round(entry.score))),
            timestamp: boundedString(entry.timestamp).slice(0, 40)
          }))
        : []
    },
    education: normalizeItems(source.education, ['school', 'degree', 'year', 'grade'], defaultState.education),
    experience: normalizeItems(source.experience, ['company', 'role', 'duration', 'description'], defaultState.experience),
    skills: Array.isArray(source.skills) ? source.skills.slice(0, MAX_IMPORT_ITEMS).map(boundedString).filter(Boolean) : [],
    projects: normalizeItems(source.projects, ['title', 'description', 'link'], defaultState.projects),
    achievements: normalizeItems(source.achievements, ['title', 'description'], defaultState.achievements)
  };
}

function persistProfileRegistry() {
  localStorage.setItem(PROFILES_INDEX_KEY, JSON.stringify(profileRegistry));
}

function ensureProfileRegistry() {
  if (profileRegistry) return profileRegistry;
  const storedRegistry = localStorage.getItem(PROFILES_INDEX_KEY);
  if (storedRegistry) {
    try {
      profileRegistry = JSON.parse(storedRegistry);
    } catch (err) {
      console.warn('Failed to parse profile registry:', err);
    }
  }
  if (!profileRegistry || !Array.isArray(profileRegistry.profiles) || profileRegistry.profiles.length === 0) {
    const profileId = createProfileId();
    let migratedData = null;
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      try {
        migratedData = normalizeState(JSON.parse(legacyData));
      } catch (err) {
        console.warn('Failed to migrate legacy resume data:', err);
      }
    }
    const now = new Date().toISOString();
    profileRegistry = {
      activeProfileId: profileId,
      profiles: [{ id: profileId, name: 'My Resume', createdAt: now, updatedAt: now }]
    };
    localStorage.setItem(`${PROFILE_DATA_KEY_PREFIX}${profileId}`, JSON.stringify(migratedData || defaultState));
    persistProfileRegistry();
  }
  if (!profileRegistry.profiles.some(profile => profile.id === profileRegistry.activeProfileId)) {
    profileRegistry.activeProfileId = profileRegistry.profiles[0].id;
  }
  persistProfileRegistry();
  return profileRegistry;
}

export function getProfiles() {
  return ensureProfileRegistry().profiles.map(profile => ({ ...profile }));
}

export function getActiveProfile() {
  const registry = ensureProfileRegistry();
  return registry.profiles.find(profile => profile.id === registry.activeProfileId) || registry.profiles[0];
}

export function createProfile(name, duplicateCurrent = false) {
  const registry = ensureProfileRegistry();
  saveState();
  const profileId = createProfileId();
  const profileName = String(name || '').trim() || 'Untitled Resume';
  const newData = duplicateCurrent ? cloneState(resumeData) : cloneState(defaultState);
  const now = new Date().toISOString();
  registry.profiles.push({ id: profileId, name: profileName, createdAt: now, updatedAt: now });
  registry.activeProfileId = profileId;
  localStorage.setItem(`${PROFILE_DATA_KEY_PREFIX}${profileId}`, JSON.stringify(newData));
  persistProfileRegistry();
  resumeData = normalizeState(newData);
  notifySubscribers();
  return getActiveProfile();
}

export function switchProfile(profileId) {
  const registry = ensureProfileRegistry();
  if (!registry.profiles.some(profile => profile.id === profileId) || profileId === registry.activeProfileId) return false;
  saveState();
  try {
    const raw = localStorage.getItem(`${PROFILE_DATA_KEY_PREFIX}${profileId}`);
    resumeData = raw ? normalizeState(JSON.parse(raw)) : cloneState(defaultState);
    registry.activeProfileId = profileId;
    persistProfileRegistry();
    notifySubscribers();
    return true;
  } catch (err) {
    console.warn('Failed to switch profile:', err);
    return false;
  }
}

export function renameProfile(profileId, newName) {
  const profile = ensureProfileRegistry().profiles.find(item => item.id === profileId);
  const trimmedName = String(newName || '').trim();
  if (!profile || !trimmedName) return false;
  profile.name = trimmedName;
  profile.updatedAt = new Date().toISOString();
  persistProfileRegistry();
  notifySubscribers();
  return true;
}

export function deleteProfile(profileId) {
  const registry = ensureProfileRegistry();
  if (registry.profiles.length <= 1) return false;
  const profileIndex = registry.profiles.findIndex(profile => profile.id === profileId);
  if (profileIndex === -1) return false;
  const wasActive = registry.activeProfileId === profileId;
  registry.profiles.splice(profileIndex, 1);
  localStorage.removeItem(`${PROFILE_DATA_KEY_PREFIX}${profileId}`);
  if (wasActive) {
    registry.activeProfileId = registry.profiles[Math.max(0, profileIndex - 1)].id;
    const nextData = localStorage.getItem(`${PROFILE_DATA_KEY_PREFIX}${registry.activeProfileId}`);
    resumeData = nextData ? normalizeState(JSON.parse(nextData)) : cloneState(defaultState);
  }
  persistProfileRegistry();
  notifySubscribers();
  return true;
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
    const registry = ensureProfileRegistry();
    const activeProfile = registry.profiles.find(profile => profile.id === registry.activeProfileId);
    localStorage.setItem(`${PROFILE_DATA_KEY_PREFIX}${registry.activeProfileId}`, JSON.stringify(resumeData));
    if (activeProfile) activeProfile.updatedAt = new Date().toISOString();
    persistProfileRegistry();
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
    const registry = ensureProfileRegistry();
    const raw = localStorage.getItem(`${PROFILE_DATA_KEY_PREFIX}${registry.activeProfileId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      resumeData = normalizeState(parsed);
    } else {
      resumeData = cloneState(defaultState);
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
  const sampleProfile = getProfiles().find(profile => profile.name === 'Sample Profile');
  if (sampleProfile) {
    if (getActiveProfile().id !== sampleProfile.id) switchProfile(sampleProfile.id);
  } else {
    createProfile('Sample Profile');
  }
  resumeData = cloneState(sampleData);
  saveState();
}

/**
 * Resets state to blank default
 */
export function resetState() {
  const preservedMeta = cloneState(resumeData.meta);
  resumeData = cloneState(defaultState);
  resumeData.meta = preservedMeta;
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
export function parseStateFromJson(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid JSON structure');
  }
  return normalizeState(parsed);
}

export function importStateFromJson(jsonString) {
  try {
    resumeData = parseStateFromJson(jsonString);

    saveState();
    return true;
  } catch (err) {
    console.error("Failed to import resume JSON:", err);
    return false;
  }
}

