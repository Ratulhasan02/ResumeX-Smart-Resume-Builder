/**
 * Form Handlers Module
 * Handles two-way binding between DOM form inputs and the central resumeData state.
 * Implements reusable createRepeatableField() for Education, Experience, Projects, and Achievements.
 * Includes debounced input handling, live validation, and summary character counter.
 */

import { resumeData, saveState } from './state.js';

// Debounce helper to prevent input lag on slower devices
function debounce(func, wait = 200) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedSaveState = debounce(() => {
  saveState();
}, 200);

const commonDomains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'live.com', 'protonmail.com'
];

const knownTypos = {
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cim': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'icloud.co': 'icloud.com'
};

const validTLDs = new Set([
  'com', 'net', 'org', 'edu', 'gov', 'io', 'info', 'biz', 'me',
  'us', 'uk', 'ca', 'au', 'in', 'bd', 'de', 'fr', 'jp', 'cn', 'ai',
  'dev', 'app', 'tech', 'online', 'store', 'xyz'
]);

function getEmailValidationError(email) {
  const formatRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]+$/;
  if (!formatRegex.test(email)) return 'Invalid email format';

  const domain = email.split('@')[1].toLowerCase();
  if (knownTypos[domain]) return `Did you mean @${knownTypos[domain]}?`;

  const tld = domain.split('.').pop();
  if (!validTLDs.has(tld)) return `".${tld}" isn't a recognized domain ending`;

  return '';
}

const countryPhoneRules = {
  '+880': { name: 'Bangladesh', length: 10 },
  '+91': { name: 'India', length: 10 },
  '+1': { name: 'US/Canada', length: 10 },
  '+44': { name: 'UK', length: 10 },
  '+61': { name: 'Australia', length: 9 },
  '+92': { name: 'Pakistan', length: 10 },
  '+94': { name: 'Sri Lanka', length: 9 },
  '+65': { name: 'Singapore', length: 8 },
  '+971': { name: 'UAE', length: 9 }
};

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
      itemWrapper.className = 'repeatable-card print:break-inside-avoid bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 relative group transition-all mb-4 hover:shadow-sm';
      itemWrapper.style.pageBreakInside = 'avoid';
      itemWrapper.style.breakInside = 'avoid';
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
  initSkillsTagHandler();

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

  const trimmed = String(email || '').trim();

  if (!input) {
    if (!trimmed) return { valid: false };
    const validationError = getEmailValidationError(trimmed);
    if (validationError) return { valid: false, message: validationError };

    return { valid: true };
  }

  if (!trimmed) {
    input.classList.remove('border-rose-500', 'border-emerald-500');
    if (msg) msg.textContent = '';
    return { valid: false };
  }

  const validationError = getEmailValidationError(trimmed);
  if (validationError) {
    input.classList.remove('border-emerald-500');
    input.classList.add('border-rose-500');
    if (msg) {
      msg.textContent = validationError === 'Invalid email format'
        ? 'Please enter a valid email address'
        : validationError;
      msg.className = 'text-[10px] text-rose-500 mt-0.5';
    }
    return { valid: false, message: validationError };
  }

  const domain = trimmed.split('@')[1].toLowerCase();
  const domainBase = domain.split('.')[0];
  const suspiciousTypo = commonDomains.find(provider => domainBase && provider.startsWith(`${domainBase}.`) && provider !== domain);
  if (suspiciousTypo && !commonDomains.includes(domain)) {
    input.classList.remove('border-emerald-500');
    input.classList.add('border-rose-500');
    if (msg) {
      msg.textContent = `Did you mean @${suspiciousTypo}?`;
      msg.className = 'text-[10px] text-rose-500 mt-0.5';
    }
    return { valid: false, message: `Did you mean @${suspiciousTypo}?` };
  }

  input.classList.remove('border-rose-500');
  input.classList.add('border-emerald-500');
  if (msg) {
    msg.textContent = '✓ Valid email';
    msg.className = 'text-[10px] text-emerald-500 mt-0.5';
  }
  return { valid: true };
}

/**
 * Phone validation visual feedback
 */
export function validatePhone(phone = '') {
  const input = typeof document !== 'undefined' ? document.getElementById('personal-phone') : null;
  const msg = typeof document !== 'undefined' ? document.getElementById('phone-validation-msg') : null;

  const trimmed = String(phone || '').trim();

  if (!input) {
    if (!trimmed) return { valid: false };
    const cleaned = trimmed.replace(/[\s\-()]/g, '');
    if (!cleaned.startsWith('+')) return { valid: false, message: 'Include country code, e.g. +880 1XXXXXXXXX' };

    const sortedCodes = Object.keys(countryPhoneRules).sort((a, b) => b.length - a.length);
    const matchedCode = sortedCodes.find(code => cleaned.startsWith(code));
    if (!matchedCode) return { valid: false, message: 'Unrecognized country code' };

    const rule = countryPhoneRules[matchedCode];
    const remainingDigits = cleaned.slice(matchedCode.length).replace(/\D/g, '');
    if (remainingDigits.length !== rule.length) {
      return {
        valid: false,
        message: `${rule.name} numbers need ${rule.length} digits after ${matchedCode} — you entered ${remainingDigits.length}`
      };
    }

    return { valid: true };
  }

  if (!trimmed) {
    input.classList.remove('border-rose-500', 'border-emerald-500');
    if (msg) msg.textContent = '';
    return { valid: false };
  }

  const cleaned = trimmed.replace(/[\s\-()]/g, '');

  if (!cleaned.startsWith('+')) {
    input.classList.remove('border-emerald-500');
    input.classList.add('border-rose-500');
    if (msg) {
      msg.textContent = 'Include country code, e.g. +880 1XXXXXXXXX';
      msg.className = 'text-[10px] text-rose-500 mt-0.5';
    }
    return { valid: false, message: 'Include country code, e.g. +880 1XXXXXXXXX' };
  }

  const sortedCodes = Object.keys(countryPhoneRules).sort((a, b) => b.length - a.length);
  const matchedCode = sortedCodes.find(code => cleaned.startsWith(code));

  if (!matchedCode) {
    input.classList.remove('border-emerald-500');
    input.classList.add('border-rose-500');
    if (msg) {
      msg.textContent = 'Unrecognized country code';
      msg.className = 'text-[10px] text-rose-500 mt-0.5';
    }
    return { valid: false, message: 'Unrecognized country code' };
  }

  const rule = countryPhoneRules[matchedCode];
  const remainingDigits = cleaned.slice(matchedCode.length).replace(/\D/g, '');

  if (remainingDigits.length !== rule.length) {
    input.classList.remove('border-emerald-500');
    input.classList.add('border-rose-500');
    if (msg) {
      msg.textContent = `${rule.name} numbers need ${rule.length} digits after ${matchedCode} — you entered ${remainingDigits.length}`;
      msg.className = 'text-[10px] text-rose-500 mt-0.5';
    }
    return {
      valid: false,
      message: `${rule.name} numbers need ${rule.length} digits after ${matchedCode} — you entered ${remainingDigits.length}`
    };
  }

  input.classList.remove('border-rose-500');
  input.classList.add('border-emerald-500');
  if (msg) {
    msg.textContent = '✓ Valid phone format';
    msg.className = 'text-[10px] text-emerald-500 mt-0.5';
  }
  return { valid: true };
}

/**
 * Handles chip-based tag input for Skills
 */
function initSkillsTagHandler() {
  const skillsInput = document.getElementById('skill-input');
  const skillsContainer = document.getElementById('skills-chip-container');
  const suggestionsContainer = document.getElementById('skill-suggestions');

  if (!skillsInput || !skillsContainer) return;

  function renderSkillChips() {
    skillsContainer.innerHTML = '';
    const skills = resumeData.skills || [];

    skills.forEach((skill, index) => {
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

      chip.querySelector('button').onclick = () => {
        resumeData.skills.splice(index, 1);
        saveState();
        renderSkillChips();
      };

      skillsContainer.appendChild(chip);
    });
  }

  function addSkill(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!resumeData.skills.includes(trimmed)) {
      resumeData.skills.push(trimmed);
      saveState();
      renderSkillChips();
    }
    skillsInput.value = '';
  }

  skillsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillsInput.value);
    }
  });

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
      btn.onclick = () => addSkill(skill);
      suggestionsContainer.appendChild(btn);
    });
  }

  renderSkillChips();
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
  const skillsContainer = document.getElementById('skills-chip-container');
  if (skillsContainer) {
    initSkillsTagHandler();
  }

  // Update validations
  updateSummaryCounter(resumeData.personal.summary || '');
  validateEmail(resumeData.personal.email || '');
  validatePhone(resumeData.personal.phone || '');
}

// Utility: Escape HTML to avoid XSS issues in input values
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
