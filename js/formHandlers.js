/**
 * Form Handlers Module
 * Handles two-way binding between DOM form inputs and the central resumeData state.
 * Implements reusable createRepeatableField() for Education, Experience, Projects, and Achievements.
 * Includes debounced input handling, live validation, and summary character counter.
 */

import { resumeData, saveState } from './state.js';
import { escapeHtml, safeUrl } from './utils.js';
import { validateEmail as checkEmail, validatePhone as checkPhone } from './validators.js';
import { applySectionOrder } from './dragDrop.js';

// Debounce helper to prevent input lag on slower devices
function debounce(func, wait = 200) {
  let timeout;
  const executedFunction = function (...args) {
    const later = () => {
      clearTimeout(timeout);
      timeout = null;
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  executedFunction.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      func();
    }
  };
  return executedFunction;
}

const debouncedSaveState = debounce(() => {
  saveState();
}, 200);

/**
 * Reusable helper to manage repeatable dynamic sections
 * (Education, Experience, Projects, Achievements)
 */
export function createRepeatableField({
  sectionKey,
  containerSelector,
  addButtonSelector,
  emptyItemFactory,
  renderItemHTML,
  onAfterRender
}) {
  const container = document.querySelector(containerSelector);
  const addBtn = document.querySelector(addButtonSelector);

  if (!container || !addBtn) return;

  function renderList() {
    container.innerHTML = '';
    const items = resumeData[sectionKey] || [];

    items.forEach((item, index) => {
      const itemWrapper = document.createElement('div');
      itemWrapper.className = 'repeatable-card bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 relative group transition-all mb-4 hover:shadow-sm';
      itemWrapper.dataset.index = index;

      itemWrapper.innerHTML = `
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-700/60">
          <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            #${index + 1} Entry
          </span>
          <button type="button" class="remove-entry-btn text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30" title="Remove Entry" aria-label="Remove this entry">
            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        ${renderItemHTML(item, index)}
      `;

      // Bind remove button
      const removeBtn = itemWrapper.querySelector('.remove-entry-btn');
      removeBtn.addEventListener('click', () => {
        if (resumeData[sectionKey].length > 1) {
          resumeData[sectionKey].splice(index, 1);
        } else {
          // Keep at least one empty item
          resumeData[sectionKey][0] = emptyItemFactory();
        }
        saveState();
        renderList();
      });

      // Bind input events for this card
      const inputs = itemWrapper.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        const fieldName = input.name;
        input.addEventListener('input', (e) => {
          if (resumeData[sectionKey][index]) {
            resumeData[sectionKey][index][fieldName] = e.target.value;
            debouncedSaveState();
          }
        });
        if (sectionKey === 'projects' && fieldName === 'link') {
          input.addEventListener('blur', () => {
            const normalizedUrl = safeUrl(input.value);
            input.value = normalizedUrl;
            if (resumeData[sectionKey][index]) {
              resumeData[sectionKey][index][fieldName] = normalizedUrl;
              debouncedSaveState();
            }
          });
        }
      });

      container.appendChild(itemWrapper);
    });

    if (typeof onAfterRender === 'function') {
      onAfterRender();
    }
  }

  // Bind add button
  addBtn.onclick = () => {
    resumeData[sectionKey].push(emptyItemFactory());
    saveState();
    renderList();
    // Scroll new item into view
    const lastCard = container.lastElementChild;
    if (lastCard) {
      const firstInput = lastCard.querySelector('input');
      if (firstInput) firstInput.focus();
    }
  };

  renderList();
  return { renderList };
}

// References to registered repeatable managers for re-rendering
const repeatableManagers = [];

/**
 * Initialize all form inputs, repeatable sections, and skill tags
 */
export function initFormHandlers() {
  // 1. Personal Information
  const personalFields = ['name', 'title', 'location'];
  personalFields.forEach(field => {
    const input = document.getElementById(`personal-${field}`);
    if (input) {
      input.value = resumeData.personal[field] || '';
      input.addEventListener('input', (e) => {
        resumeData.personal[field] = e.target.value;
        debouncedSaveState();
      });
    }
  });

  // Validated Email Input
  const emailInput = document.getElementById('personal-email');
  if (emailInput) {
    emailInput.value = resumeData.personal.email || '';
    emailInput.addEventListener('input', (e) => {
      resumeData.personal.email = e.target.value;
      validateEmail(e.target.value);
      debouncedSaveState();
    });
  }

  // Validated Phone Input
  const phoneInput = document.getElementById('personal-phone');
  if (phoneInput) {
    phoneInput.value = resumeData.personal.phone || '';
    phoneInput.addEventListener('input', (e) => {
      resumeData.personal.phone = e.target.value;
      validatePhone(e.target.value);
      debouncedSaveState();
    });
  }

  // Summary with Live Character Counter
  const summaryInput = document.getElementById('personal-summary');
  if (summaryInput) {
    summaryInput.value = resumeData.personal.summary || '';
    summaryInput.addEventListener('input', (e) => {
      resumeData.personal.summary = e.target.value;
      updateSummaryCounter(e.target.value);
      debouncedSaveState();
    });
  }

  // 2. Social Links
  const linkFields = ['linkedin', 'github', 'portfolio'];
  linkFields.forEach(field => {
    const input = document.getElementById(`link-${field}`);
    if (input) {
      input.value = resumeData.links[field] || '';
      input.addEventListener('input', (e) => {
        resumeData.links[field] = e.target.value;
        debouncedSaveState();
      });
      input.addEventListener('blur', () => {
        const normalizedUrl = safeUrl(input.value);
        input.value = normalizedUrl;
        resumeData.links[field] = normalizedUrl;
        debouncedSaveState();
      });
    }
  });

  // 3. Repeatable: Education
  const eduManager = createRepeatableField({
    sectionKey: 'education',
    containerSelector: '#education-container',
    addButtonSelector: '#add-education-btn',
    emptyItemFactory: () => ({ school: '', degree: '', year: '', grade: '' }),
    renderItemHTML: (item, idx) => `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label for="edu-school-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Institution / School <span class="text-rose-500">*</span></label>
          <input id="edu-school-${idx}" type="text" name="school" value="${escapeHtml(item.school || '')}" placeholder="e.g. UC Berkeley" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label for="edu-degree-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Degree / Major <span class="text-rose-500">*</span></label>
          <input id="edu-degree-${idx}" type="text" name="degree" value="${escapeHtml(item.degree || '')}" placeholder="e.g. B.S. in Computer Science" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label for="edu-year-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Years / Dates</label>
          <input id="edu-year-${idx}" type="text" name="year" value="${escapeHtml(item.year || '')}" placeholder="e.g. 2018 - 2022" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label for="edu-grade-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">GPA / Grade (Optional)</label>
          <input id="edu-grade-${idx}" type="text" name="grade" value="${escapeHtml(item.grade || '')}" placeholder="e.g. 3.9 GPA / Magna Cum Laude" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
      </div>
    `
  });
  repeatableManagers.push(eduManager);

  // 4. Repeatable: Experience
  const expManager = createRepeatableField({
    sectionKey: 'experience',
    containerSelector: '#experience-container',
    addButtonSelector: '#add-experience-btn',
    emptyItemFactory: () => ({ company: '', role: '', duration: '', description: '' }),
    renderItemHTML: (item, idx) => `
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label for="exp-company-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Company / Organization <span class="text-rose-500">*</span></label>
            <input id="exp-company-${idx}" type="text" name="company" value="${escapeHtml(item.company || '')}" placeholder="e.g. Google" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label for="exp-role-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Role / Job Title <span class="text-rose-500">*</span></label>
            <input id="exp-role-${idx}" type="text" name="role" value="${escapeHtml(item.role || '')}" placeholder="e.g. Senior Frontend Engineer" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label for="exp-duration-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Duration</label>
          <input id="exp-duration-${idx}" type="text" name="duration" value="${escapeHtml(item.duration || '')}" placeholder="e.g. Jan 2021 - Present" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label for="exp-desc-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Responsibilities & Achievements (Use • bullet points)</label>
          <textarea id="exp-desc-${idx}" name="description" rows="3" placeholder="• Architected microservice pipelines that reduced latency by 30%..." class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">${escapeHtml(item.description || '')}</textarea>
        </div>
      </div>
    `
  });
  repeatableManagers.push(expManager);

  // 5. Repeatable: Projects
  const projManager = createRepeatableField({
    sectionKey: 'projects',
    containerSelector: '#projects-container',
    addButtonSelector: '#add-projects-btn',
    emptyItemFactory: () => ({ title: '', description: '', link: '' }),
    renderItemHTML: (item, idx) => `
      <div class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label for="proj-title-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Project Title <span class="text-rose-500">*</span></label>
            <input id="proj-title-${idx}" type="text" name="title" value="${escapeHtml(item.title || '')}" placeholder="e.g. Open-Source Design System" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label for="proj-link-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Live Demo / Repository Link</label>
            <input id="proj-link-${idx}" type="text" name="link" value="${escapeHtml(item.link || '')}" placeholder="e.g. https://github.com/..." class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label for="proj-desc-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Project Description & Impact</label>
          <textarea id="proj-desc-${idx}" name="description" rows="2" placeholder="Brief description of tech stack, architectural highlights, and outcomes..." class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">${escapeHtml(item.description || '')}</textarea>
        </div>
      </div>
    `
  });
  repeatableManagers.push(projManager);

  // 6. Repeatable: Achievements & Certifications
  const achManager = createRepeatableField({
    sectionKey: 'achievements',
    containerSelector: '#achievements-container',
    addButtonSelector: '#add-achievements-btn',
    emptyItemFactory: () => ({ title: '', description: '' }),
    renderItemHTML: (item, idx) => `
      <div class="space-y-3">
        <div>
          <label for="ach-title-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Honor / Certification Title <span class="text-rose-500">*</span></label>
          <input id="ach-title-${idx}" type="text" name="title" value="${escapeHtml(item.title || '')}" placeholder="e.g. AWS Certified Solutions Architect" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label for="ach-desc-${idx}" class="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Summary / Credential ID</label>
          <input id="ach-desc-${idx}" type="text" name="description" value="${escapeHtml(item.description || '')}" placeholder="e.g. Issued by Amazon Web Services • 2023" class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
      </div>
    `
  });
  repeatableManagers.push(achManager);

  // 7. Interactive Skills Tag Chip Input
  bindSkillsInput();
  renderSkillChips();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') debouncedSaveState.flush();
  });
  window.addEventListener('pagehide', () => debouncedSaveState.flush());

  // Initial validation checks
  updateSummaryCounter(resumeData.personal.summary || '');
  validateEmail(resumeData.personal.email || '');
  validatePhone(resumeData.personal.phone || '');
}
/**
 * Summary Character Counter logic (Max 450 characters)
 */
function updateSummaryCounter(text = '') {
  const counter = document.getElementById('summary-char-counter');
  if (!counter) return;

  const len = text.length;
  const max = 450;
  counter.textContent = `${len} / ${max} characters`;

  if (len > max) {
    counter.className = 'text-[11px] font-medium text-rose-500';
  } else if (len > 350) {
    counter.className = 'text-[11px] font-medium text-amber-500';
  } else {
    counter.className = 'text-[11px] font-medium text-slate-400 dark:text-slate-500';
  }
}

/**
 * Email validation visual feedback
 */
export function validateEmail(email = '') {
  const input = typeof document !== 'undefined' ? document.getElementById('personal-email') : null;
  const msg = typeof document !== 'undefined' ? document.getElementById('email-validation-msg') : null;
  const result = checkEmail(email);

  if (!input) return result;
  if (!String(email || '').trim()) {
    input.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500');
    if (msg) msg.textContent = '';
    return result;
  }
  if (!result.valid) {
    input.classList.remove('border-emerald-500', 'border-amber-500');
    input.classList.add('border-rose-500');
    if (msg) {
      msg.textContent = 'Please enter a valid email address';
      msg.className = 'text-[10px] text-rose-500 mt-0.5';
    }
    return result;
  }

  if (result.warning) {
    input.classList.remove('border-rose-500', 'border-emerald-500');
    input.classList.add('border-amber-500');
    if (msg) {
      msg.textContent = result.warning;
      msg.className = 'text-[10px] text-amber-600 mt-0.5';
    }
    return result;
  }

  input.classList.remove('border-rose-500', 'border-amber-500');
  input.classList.add('border-emerald-500');
  if (msg) {
    msg.textContent = 'Valid email';
    msg.className = 'text-[10px] text-emerald-500 mt-0.5';
  }
  return result;
}

/**
 * Phone validation visual feedback
 */
export function validatePhone(phone = '') {
  const input = typeof document !== 'undefined' ? document.getElementById('personal-phone') : null;
  const msg = typeof document !== 'undefined' ? document.getElementById('phone-validation-msg') : null;
  const result = checkPhone(phone);

  if (!input) return result;
  if (!String(phone || '').trim()) {
    input.classList.remove('border-rose-500', 'border-emerald-500', 'border-amber-500');
    if (msg) msg.textContent = '';
    return result;
  }
  if (!result.valid) {
    input.classList.remove('border-emerald-500', 'border-amber-500');
    input.classList.add('border-rose-500');
    if (msg) {
      msg.textContent = result.message;
      msg.className = 'text-[10px] text-rose-500 mt-0.5';
    }
    return result;
  }

  if (result.warning) {
    input.classList.remove('border-rose-500', 'border-emerald-500');
    input.classList.add('border-amber-500');
    if (msg) {
      msg.textContent = result.warning;
      msg.className = 'text-[10px] text-amber-600 mt-0.5';
    }
    return result;
  }

  input.classList.remove('border-rose-500', 'border-amber-500');
  input.classList.add('border-emerald-500');
  if (msg) {
    msg.textContent = 'Valid phone format';
    msg.className = 'text-[10px] text-emerald-500 mt-0.5';
  }
  return result;
}

/**
 * Handles chip-based tag input for Skills
 */
function renderSkillChips() {
  const skillsContainer = document.getElementById('skills-chip-container');
  if (!skillsContainer) return;

  skillsContainer.innerHTML = '';
  (resumeData.skills || []).forEach((skill, index) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60';
    chip.innerHTML = `
      <span>${escapeHtml(skill)}</span>
      <button type="button" class="hover:text-rose-600 dark:hover:text-rose-400 rounded-full p-0.5" title="Remove skill" aria-label="Remove skill ${escapeHtml(skill)}">
        <svg class="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;
    chip.querySelector('button').addEventListener('click', () => {
      resumeData.skills.splice(index, 1);
      saveState();
      renderSkillChips();
    });
    skillsContainer.appendChild(chip);
  });
}

function addSkillValues(values) {
  const existing = new Set((resumeData.skills || []).map(skill => skill.toLowerCase()));
  let changed = false;
  values.forEach(value => {
    const skill = value.trim();
    const key = skill.toLowerCase();
    if (skill && !existing.has(key)) {
      resumeData.skills.push(skill);
      existing.add(key);
      changed = true;
    }
  });
  if (changed) saveState();
  renderSkillChips();
}

function bindSkillsInput() {
  const skillsInput = document.getElementById('skill-input');
  const suggestionsContainer = document.getElementById('skill-suggestions');
  if (!skillsInput || skillsInput.dataset.listenerBound === 'true') return;
  skillsInput.dataset.listenerBound = 'true';

  const addPendingSkills = () => {
    addSkillValues(skillsInput.value.split(/[\n,]+/));
    skillsInput.value = '';
  };

  skillsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addPendingSkills();
    }
  });
  skillsInput.addEventListener('blur', addPendingSkills);

  // Quick suggestions
  if (suggestionsContainer) {
    const popularSkills = [
      "TypeScript", "React", "Node.js", "Python", 
      "Docker", "AWS", "Tailwind CSS", "PostgreSQL", "Git"
    ];
    suggestionsContainer.innerHTML = '';
    popularSkills.forEach(skill => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300 transition-colors border border-slate-200 dark:border-slate-700';
      btn.textContent = `+ ${skill}`;
      btn.onclick = () => addSkillValues([skill]);
      suggestionsContainer.appendChild(btn);
    });
  }
}

/**
 * Re-populates all inputs from the current resumeData state
 * (Used when loading sample data, importing JSON, or resetting)
 */
export function populateFormFromState() {
  // Personal inputs
  const personalFields = ['name', 'title', 'location', 'summary'];
  personalFields.forEach(field => {
    const input = document.getElementById(`personal-${field}`);
    if (input) {
      input.value = resumeData.personal[field] || '';
    }
  });

  const emailInput = document.getElementById('personal-email');
  if (emailInput) emailInput.value = resumeData.personal.email || '';

  const phoneInput = document.getElementById('personal-phone');
  if (phoneInput) phoneInput.value = resumeData.personal.phone || '';

  // Social links
  const linkFields = ['linkedin', 'github', 'portfolio'];
  linkFields.forEach(field => {
    const input = document.getElementById(`link-${field}`);
    if (input) {
      input.value = resumeData.links[field] || '';
    }
  });

  // Re-render repeatable cards
  repeatableManagers.forEach(mgr => {
    if (mgr && typeof mgr.renderList === 'function') {
      mgr.renderList();
    }
  });

  // Re-render skills
  renderSkillChips();
  applySectionOrder();

  // Update validations
  updateSummaryCounter(resumeData.personal.summary || '');
  validateEmail(resumeData.personal.email || '');
  validatePhone(resumeData.personal.phone || '');
}

