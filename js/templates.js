/**
 * Templates Module
 * Contains 4 distinct resume design templates:
 * - Template 1: Modern Clean (Single-column layout, sleek typography, clean lines)
 * - Template 2: Executive Split (Two-column layout with colored/shaded sidebar)
 * - Template 3: Tech Specialist (Developer-focused layout with pills and project links)
 * - Template 4: Classic Elegance (Serif headings, traditional executive/academic layout)
 */

import { escapeHtml as esc, safeUrl } from './utils.js';

// Convert multiline text or bullet points into formatted paragraphs/bullets
function formatDescription(desc) {
  if (!desc) return '';
  const lines = String(desc).split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const output = [];
  let bullets = [];
  const flushBullets = () => {
    if (bullets.length) {
      output.push(`<ul class="list-disc list-outside pl-4 space-y-0.5 mt-1">${bullets.join('')}</ul>`);
      bullets = [];
    }
  };
  lines.forEach(line => {
    const bullet = line.match(/^[•*-]\s+(.+)$/);
    if (bullet) {
      bullets.push(`<li class="mb-1 text-slate-700 leading-relaxed text-xs">${esc(bullet[1])}</li>`);
    } else {
      flushBullets();
      output.push(`<p class="mb-1 text-slate-700 leading-relaxed text-xs">${esc(line)}</p>`);
    }
  });
  flushBullets();
  return output.join('');
}

/**
 * Check if the resume is completely blank
 */
export function isResumeEmpty(data) {
  const { personal, experience, education, projects, achievements, skills } = data;
  const hasName = Boolean(personal?.name?.trim());
  const hasTitle = Boolean(personal?.title?.trim());
  const hasSummary = Boolean(personal?.summary?.trim());
  const hasExp = (experience || []).some(e => e.company?.trim() || e.role?.trim());
  const hasEdu = (education || []).some(e => e.school?.trim() || e.degree?.trim());
  const hasProj = (projects || []).some(p => p.title?.trim());
  const hasAch = (achievements || []).some(a => a.title?.trim());
  const hasSkills = (skills || []).length > 0;

  return !hasName && !hasTitle && !hasSummary && !hasExp && !hasEdu && !hasProj && !hasAch && !hasSkills;
}

/**
 * Render inviting Empty State
 */
function renderEmptyState() {
  return `
    <div class="flex flex-col items-center justify-center p-12 text-center h-full min-h-[297mm] bg-gradient-to-b from-white to-slate-50 font-sans">
      <div class="w-16 h-16 mb-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>
      <h2 class="text-xl font-extrabold text-slate-800 font-heading mb-2">Your Resume Canvas is Ready</h2>
      <p class="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
        Start filling your details in the left editor panel to see your resume come to life, or load our pre-filled senior engineer profile.
      </p>
      <button id="empty-state-sample-btn" type="button" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all cursor-pointer">
        <span>✨</span>
        <span>Load Senior Engineer Profile</span>
      </button>
    </div>
  `;
}


/* ============================================================
   SHARED SECTION RENDERERS (respects dynamic sectionOrder)
   ============================================================ */

function renderExperienceSection(data, accentColor, headingStyle = 'default') {
  const items = (data.experience || []).filter(e => [e.company, e.role, e.description].some(value => String(value || '').trim()));
  if (items.length === 0) return '';

  return `
    <section class="resume-section mb-5" data-section="experience">
      ${renderSectionHeader("Work Experience", accentColor, headingStyle)}
      <div class="space-y-3.5">
        ${items.map(item => `
          <div class="experience-item">
            <div class="flex items-baseline justify-between flex-wrap gap-1">
              <div>
                <span class="font-bold text-slate-900 text-sm">${esc(item.role || 'Position')}</span>
                ${item.company ? `<span class="text-slate-600 text-xs"> — <span class="font-medium text-slate-800">${esc(item.company)}</span></span>` : ''}
              </div>
              ${item.duration ? `<span class="text-[11px] font-medium text-slate-500">${esc(item.duration)}</span>` : ''}
            </div>
            ${formatDescription(item.description)}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderEducationSection(data, accentColor, headingStyle = 'default') {
  const items = (data.education || []).filter(e => [e.school, e.degree, e.year, e.grade].some(value => String(value || '').trim()));
  if (items.length === 0) return '';

  return `
    <section class="resume-section mb-5" data-section="education">
      ${renderSectionHeader("Education", accentColor, headingStyle)}
      <div class="space-y-2.5">
        ${items.map(item => `
          <div class="education-item flex items-baseline justify-between flex-wrap gap-1">
            <div>
              <span class="font-bold text-slate-900 text-sm">${esc(item.school || 'Institution')}</span>
              ${item.degree ? `<div class="text-xs text-slate-700 font-medium">${esc(item.degree)}</div>` : ''}
            </div>
            <div class="text-right">
              ${item.year ? `<div class="text-[11px] font-medium text-slate-500">${esc(item.year)}</div>` : ''}
              ${item.grade ? `<div class="text-[11px] text-slate-600">${esc(item.grade)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSkillsSection(data, accentColor, headingStyle = 'default', styleType = 'chips') {
  const skills = (data.skills || []).filter(skill => String(skill || '').trim());
  if (skills.length === 0) return '';

  return `
    <section class="resume-section mb-5" data-section="skills">
      ${renderSectionHeader("Skills & Competencies", accentColor, headingStyle)}
      <div class="flex flex-wrap gap-1.5 pt-0.5">
        ${skills.map((s, index) => {
          if (styleType === 'chips') {
            return `<span class="inline-block px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200/80">${esc(s)}</span>`;
          } else if (styleType === 'pills') {
            return `<span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium" style="background-color: ${accentColor}15; color: ${accentColor};">${esc(s)}</span>`;
          } else {
            return `<span class="text-xs text-slate-800 font-medium">${index ? '<span class="text-slate-400 mx-1">•</span>' : ''}${esc(s)}</span>`;
          }
        }).join('')}
      </div>
    </section>
  `;
}

function renderProjectsSection(data, accentColor, headingStyle = 'default') {
  const items = (data.projects || []).filter(p => [p.title, p.description, p.link].some(value => String(value || '').trim()));
  if (items.length === 0) return '';

  return `
    <section class="resume-section mb-5" data-section="projects">
      ${renderSectionHeader("Featured Projects", accentColor, headingStyle)}
      <div class="space-y-3">
        ${items.map(item => `
          <div class="project-item">
            <div class="flex items-center justify-between flex-wrap gap-1">
              <span class="font-bold text-slate-900 text-xs">${esc(item.title)}</span>
              ${safeUrl(item.link) ? `
                    <a href="${esc(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer" class="text-[11px] hover:underline flex items-center gap-1 font-medium min-w-0 break-all" style="color: ${accentColor};">
                      ${esc(item.link.replace(/^https?:\/\//, ''))}
                  <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              ` : ''}
            </div>
            ${formatDescription(item.description)}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderAchievementsSection(data, accentColor, headingStyle = 'default') {
  const items = (data.achievements || []).filter(a => [a.title, a.description].some(value => String(value || '').trim()));
  if (items.length === 0) return '';

  return `
    <section class="resume-section mb-5" data-section="achievements">
      ${renderSectionHeader("Honors & Certifications", accentColor, headingStyle)}
      <div class="space-y-2">
        ${items.map(item => `
          <div>
            <div class="font-semibold text-slate-900 text-xs">${esc(item.title)}</div>
            ${item.description ? `<div class="text-[11px] text-slate-600 leading-relaxed">${esc(item.description)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderLinksSection(data, accentColor, headingStyle = 'default') {
  const links = data.links || {};
  const activeLinks = [
    { label: 'LinkedIn', url: links.linkedin },
    { label: 'GitHub', url: links.github },
    { label: 'Portfolio', url: links.portfolio }
  ].map(link => ({ ...link, safeUrl: safeUrl(link.url) })).filter(l => l.safeUrl);

  if (activeLinks.length === 0) return '';

  return `
    <section class="resume-section mb-4" data-section="links">
      ${renderSectionHeader("Links & Profiles", accentColor, headingStyle)}
      <div class="flex flex-wrap gap-4 text-xs">
        ${activeLinks.map(l => `
          <a href="${esc(l.safeUrl)}" target="_blank" rel="noopener noreferrer" class="hover:underline flex items-center gap-1 font-medium" style="color: ${accentColor};">
            <span class="font-semibold text-slate-800">${l.label}:</span>
            <span>${esc(l.url.replace(/^https?:\/\//, ''))}</span>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

function renderSectionHeader(title, accentColor, style = 'default') {
  if (style === 'serif') {
    return `
      <div class="border-b border-slate-300 pb-1 mb-2.5">
        <h2 class="text-sm font-bold tracking-wide uppercase text-slate-800" style="font-family: var(--font-serif);">${title}</h2>
      </div>
    `;
  } else if (style === 'boxed') {
    return `
      <div class="flex items-center gap-2 mb-2.5">
        <h2 class="text-xs font-bold tracking-wider uppercase text-slate-900">${title}</h2>
        <div class="h-0.5 flex-1" style="background-color: ${accentColor}25;"></div>
      </div>
    `;
  } else {
    // Default modern clean underline
    return `
      <div class="section-title flex items-center gap-2 border-b-2" style="border-color: ${accentColor};">
        <h2 class="text-xs font-bold tracking-wider uppercase" style="color: ${accentColor};">${title}</h2>
      </div>
    `;
  }
}

/* ============================================================
   TEMPLATE 1: Modern Clean (Single Column)
   ============================================================ */
export function template1(data) {
  if (isResumeEmpty(data)) return renderEmptyState();
  const { personal = {}, meta = {} } = data;
  const accent = meta.accentColor || '#4f46e5';
  const order = meta.sectionOrder || ["personal", "experience", "education", "skills", "projects", "achievements", "links"];

  // Header Contact Line
  const contacts = [
    personal.email ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>${esc(personal.email)}</span>` : '',
    personal.phone ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${esc(personal.phone)}</span>` : '',
    personal.location ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>${esc(personal.location)}</span>` : '',
    safeUrl(data.links?.linkedin) ? `<a href="${esc(safeUrl(data.links.linkedin))}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color: ${accent};">LinkedIn</a>` : '',
    safeUrl(data.links?.github) ? `<a href="${esc(safeUrl(data.links.github))}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color: ${accent};">GitHub</a>` : '',
    safeUrl(data.links?.portfolio) ? `<a href="${esc(safeUrl(data.links.portfolio))}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color: ${accent};">Portfolio</a>` : ''
  ].filter(Boolean).join('<span class="text-slate-300">•</span>');

  const sectionMap = {
    experience: () => renderExperienceSection(data, accent, 'default'),
    education: () => renderEducationSection(data, accent, 'default'),
    skills: () => renderSkillsSection(data, accent, 'default', 'chips'),
    projects: () => renderProjectsSection(data, accent, 'default'),
    achievements: () => renderAchievementsSection(data, accent, 'default'),
    links: () => '' // already in header contact line
  };

  const dynamicBody = order
    .filter(k => k !== 'personal' && sectionMap[k])
    .map(k => sectionMap[k]())
    .join('');

  return `
    <div class="p-8 font-sans">
      <!-- Header -->
      <header class="border-b border-slate-200 pb-5 mb-5 text-center">
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 mb-1" style="font-family: var(--font-heading);">${esc(personal.name || 'Your Full Name')}</h1>
        ${personal.title ? `<div class="text-sm font-semibold mb-3 tracking-wide" style="color: ${accent};">${esc(personal.title)}</div>` : ''}
        <div class="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
          ${contacts}
        </div>
        ${personal.summary ? `
          <p class="text-xs text-slate-700 leading-relaxed max-w-2xl mx-auto mt-3 text-justify">
            ${esc(personal.summary)}
          </p>
        ` : ''}
      </header>

      <!-- Dynamic Sections Ordered by User -->
      <main>
        ${dynamicBody}
      </main>
    </div>
  `;
}

/* ============================================================
   TEMPLATE 2: Executive Split (Asymmetric Two-Column Sidebar)
   ============================================================ */
export function template2(data) {
  if (isResumeEmpty(data)) return renderEmptyState();
  const { personal = {}, meta = {} } = data;
  const accent = meta.accentColor || '#4f46e5';
  const order = meta.sectionOrder || ['personal', 'experience', 'education', 'skills', 'projects', 'achievements', 'links'];
  const sidebarSections = {
    links: () => renderLinksSection(data, accent, 'boxed'),
    skills: () => renderSkillsSection(data, accent, 'boxed', 'pills'),
    education: () => renderEducationSection(data, accent, 'boxed')
  };
  const mainSections = {
    experience: () => renderExperienceSection(data, accent, 'boxed'),
    projects: () => renderProjectsSection(data, accent, 'boxed'),
    achievements: () => renderAchievementsSection(data, accent, 'boxed')
  };
  const sidebarBody = order.filter(key => sidebarSections[key]).map(key => sidebarSections[key]()).join('');
  const mainBody = order.filter(key => mainSections[key]).map(key => mainSections[key]()).join('');
  return `
    <div class="flex min-h-full font-sans">
      <!-- Left Sidebar Column -->
      <aside class="w-1/3 bg-slate-50 p-6 border-r border-slate-200 space-y-5 text-slate-800">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-slate-900 leading-tight mb-1" style="font-family: var(--font-heading);">
            ${esc(personal.name || 'Your Name')}
          </h1>
          ${personal.title ? `<div class="text-xs font-semibold" style="color: ${accent};">${esc(personal.title)}</div>` : ''}
        </div>

        <!-- Contact details -->
        <div class="space-y-2 text-xs">
          <div class="text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-200 pb-1">Contact</div>
          ${personal.email ? `<div class="break-all font-medium text-slate-700">${esc(personal.email)}</div>` : ''}
          ${personal.phone ? `<div class="text-slate-700 font-medium">${esc(personal.phone)}</div>` : ''}
          ${personal.location ? `<div class="text-slate-700">${esc(personal.location)}</div>` : ''}
        </div>

        ${sidebarBody}
      </aside>

      <!-- Main Column -->
      <main class="w-2/3 p-6 space-y-4">
        ${personal.summary ? `
          <section class="mb-5">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-1 mb-2" style="border-color: ${accent};">Executive Summary</div>
            <p class="text-xs text-slate-700 leading-relaxed text-justify">
              ${esc(personal.summary)}
            </p>
          </section>
        ` : ''}

        ${mainBody}
      </main>
    </div>
  `;
}

/* ============================================================
   TEMPLATE 3: Tech Specialist (Pills, badges, monospace highlights)
   ============================================================ */
export function template3(data) {
  if (isResumeEmpty(data)) return renderEmptyState();
  const { personal = {}, meta = {} } = data;
  const accent = meta.accentColor || '#0284c7';
  const order = meta.sectionOrder || ["personal", "skills", "experience", "projects", "education", "achievements", "links"];

  const sectionMap = {
    skills: () => renderSkillsSection(data, accent, 'default', 'pills'),
    experience: () => renderExperienceSection(data, accent, 'default'),
    projects: () => renderProjectsSection(data, accent, 'default'),
    education: () => renderEducationSection(data, accent, 'default'),
    achievements: () => renderAchievementsSection(data, accent, 'default'),
    links: () => renderLinksSection(data, accent, 'default')
  };

  const dynamicBody = order
    .filter(k => k !== 'personal' && sectionMap[k])
    .map(k => sectionMap[k]())
    .join('');

  return `
    <div class="font-sans">
      <!-- Tech Header -->
      <header class="bg-slate-900 text-white p-8 mb-6 rounded-b-xl shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold tracking-tight font-heading">${esc(personal.name || 'Your Full Name')}</h1>
            ${personal.title ? `<div class="text-sm font-semibold tracking-wide text-cyan-400 mt-0.5">${esc(personal.title)}</div>` : ''}
          </div>
          <div class="text-right text-xs space-y-1 text-slate-300 font-mono">
            ${personal.email ? `<div>${esc(personal.email)}</div>` : ''}
            ${personal.phone ? `<div>${esc(personal.phone)}</div>` : ''}
            ${personal.location ? `<div>${esc(personal.location)}</div>` : ''}
          </div>
        </div>

        ${personal.summary ? `
          <div class="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
            ${esc(personal.summary)}
          </div>
        ` : ''}
      </header>

      <!-- Content -->
      <main class="px-8 pb-8 pt-0">
        ${dynamicBody}
      </main>
    </div>
  `;
}

/* ============================================================
   TEMPLATE 4: Classic Elegance (Traditional Serif Header, Refined)
   ============================================================ */
export function template4(data) {
  if (isResumeEmpty(data)) return renderEmptyState();
  const { personal = {}, meta = {} } = data;
  const accent = meta.accentColor || '#1e293b';
  const order = meta.sectionOrder || ["personal", "education", "experience", "projects", "skills", "achievements", "links"];

  const sectionMap = {
    education: () => renderEducationSection(data, accent, 'serif'),
    experience: () => renderExperienceSection(data, accent, 'serif'),
    projects: () => renderProjectsSection(data, accent, 'serif'),
    skills: () => renderSkillsSection(data, accent, 'serif', 'text'),
    achievements: () => renderAchievementsSection(data, accent, 'serif'),
    links: () => renderLinksSection(data, accent, 'serif')
  };

  const dynamicBody = order
    .filter(k => k !== 'personal' && sectionMap[k])
    .map(k => sectionMap[k]())
    .join('');

  return `
    <div class="p-9" style="font-family: Georgia, 'Times New Roman', serif;">
      <!-- Centered Classic Header -->
      <header class="text-center border-b-2 border-slate-800 pb-4 mb-5">
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 uppercase mb-1" style="font-family: var(--font-serif); letter-spacing: 0.05em;">
          ${esc(personal.name || 'Your Full Name')}
        </h1>
        ${personal.title ? `<div class="text-xs uppercase tracking-widest text-slate-600 font-sans mb-2 font-semibold">${esc(personal.title)}</div>` : ''}
        <div class="text-xs text-slate-600 font-sans flex items-center justify-center gap-2 flex-wrap">
          ${[personal.location, personal.phone, personal.email]
            .filter(Boolean)
            .map(item => `<span>${esc(item)}</span>`)
            .join('<span class="text-slate-400">|</span>')}
        </div>
        ${personal.summary ? `
          <p class="text-xs text-slate-800 italic mt-3 max-w-2xl mx-auto leading-relaxed text-justify">
            "${esc(personal.summary)}"
          </p>
        ` : ''}
      </header>

      <!-- Main Body -->
      <main>
        ${dynamicBody}
      </main>
    </div>
  `;
}


// Template registry
export const templates = {
  template1: Object.assign(template1, { layout: 'single' }),
  template2: Object.assign(template2, { layout: 'two-column' }),
  template3: Object.assign(template3, { layout: 'single' }),
  template4: Object.assign(template4, { layout: 'single' })
};
