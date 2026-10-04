/**
 * ATS Compatibility Checker & Job Description Keyword Matcher Module
 * Evaluates resumes for Applicant Tracking System (ATS) readability and matches keywords from job postings.
 */

import { resumeData, saveState, subscribe } from './state.js';
import { escapeHtml } from './utils.js';
import { templates } from './templates.js';
import { validateEmail, validatePhone } from './validators.js';
import { matchJobDescription as matchWeightedJobDescription, getResumeQualityFindings } from './atsEngine.js';

/**
 * Calculates ATS readiness score and generates a list of actionable warnings
 */
export function analyzeAtsCompatibility() {
  const issues = [];
  const passes = [];
  let score = 100;

  const { personal, education, experience, skills, meta } = resumeData;

  // 1. Template Layout Check (Two-column reading-order risk)
  const isTwoColumnTemplate = templates[meta?.template]?.layout === 'two-column';

  if (isTwoColumnTemplate) {
    const layoutPenalty = 10;
    score -= layoutPenalty;
    issues.push({
      type: 'warning',
      title: '⚠️ Two-Column Layout Detected',
      desc: 'Your resume uses a two-column layout. Some ATS systems may read the content in the wrong order.',
      recommendation: 'Switch to a single-column template for better ATS compatibility.',
      fixTarget: 'template1',
      scoreImpact: layoutPenalty
    });
  } else {
    passes.push({
      title: 'ATS-Friendly Single-Column Layout',
      desc: 'Current template layout uses a linear hierarchy easily scanned by all ATS parsers.'
    });
  }

  // 2. Full Name
  if (!personal?.name?.trim()) {
    score -= 20;
    issues.push({
      type: 'error',
      title: 'Missing Full Name',
      desc: 'An ATS cannot index a candidate without a clear, prominent header name.',
      fixTarget: 'personal-name'
    });
  } else {
    passes.push({
      title: 'Name Present',
      desc: `Identified candidate name: "${personal.name}".`
    });
  }

  // 3. Contact Details
  const hasEmail = validateEmail(personal?.email).valid;
  const hasPhone = validatePhone(personal?.phone).valid;

  if (!hasEmail) {
    score -= 15;
    issues.push({
      type: 'error',
      title: 'Missing or Invalid Email',
      desc: 'A valid email address is required for ATS recruiter outreach.',
      fixTarget: 'personal-email'
    });
  }
  if (!hasPhone) {
    score -= 10;
    issues.push({
      type: 'warning',
      title: 'Missing Phone Number',
      desc: 'Recruiters and automated screeners frequently filter candidates without phone contact.',
      fixTarget: 'personal-phone'
    });
  }
  if (hasEmail && hasPhone) {
    passes.push({
      title: 'Complete Contact Channels',
      desc: 'Email and phone number are formatted and readily extractable.'
    });
  }

  // 4. Work Experience & Impact Bullets
  const validExp = (experience || []).filter(e => e.company?.trim() && e.role?.trim());
  if (validExp.length === 0) {
    score -= 20;
    issues.push({
      type: 'error',
      title: 'No Work Experience Listed',
      desc: 'ATS algorithms heavily weigh past job titles, company names, and employment history.',
      fixTarget: 'experience-container'
    });
  } else {
    const hasBullets = validExp.every(entry => (entry.description || '').split(/\r?\n/)
      .filter(line => /^\s*(?:[•*-]|\d+[.)])\s+\S/.test(line)).length >= 2);
    if (!hasBullets) {
      score -= 10;
      issues.push({
        type: 'warning',
        title: 'Action-Oriented Experience Bullets',
        desc: 'Add at least two real bullet lines for every role, starting with strong action verbs (e.g., "Architected", "Reduced", "Engineered").'
      });
    } else {
      passes.push({
        title: 'Structured Work Experience',
        desc: `${validExp.length} position(s) with clear role titles and accomplishments.`
      });
    }
  }

  // 5. Skills Section
  const validSkills = (skills || []).filter(s => s?.trim());
  if (validSkills.length < 5) {
    score -= 15;
    issues.push({
      type: 'warning',
      title: 'Low Skill Count',
      desc: `Only ${validSkills.length} skill(s) detected. ATS systems match resumes against job descriptions by keyword frequency. Aim for 8-15 core skills.`,
      fixTarget: 'skill-input'
    });
  } else {
    passes.push({
      title: 'Rich Skills Inventory',
      desc: `${validSkills.length} discrete skills tagged and ready for parsing.`
    });
  }

  // 6. Education
  const validEdu = (education || []).filter(e => e.school?.trim() || e.degree?.trim());
  if (validEdu.length === 0) {
    score -= 10;
    issues.push({
      type: 'warning',
      title: 'Missing Education History',
      desc: 'Many ATS filters require degree or educational institution validation.',
      fixTarget: 'education-container'
    });
  } else {
    passes.push({
      title: 'Education Verified',
      desc: 'Degree and institution details are clear.'
    });
  }

  const qualityFindings = getResumeQualityFindings(resumeData);
  const qualityPenalty = Math.min(20, qualityFindings.length * 2);
  score -= qualityPenalty;
  qualityFindings.forEach((finding, index) => {
    issues.push({
      type: 'warning',
      title: finding.title,
      desc: finding.desc,
      fixTarget: finding.fixTarget,
      scoreImpact: index === 0 ? qualityPenalty : undefined
    });
  });

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    passes
  };
}

export function matchJobDescription(jobDescText) {
  return matchWeightedJobDescription(jobDescText, resumeData);
}

/**
 * Initialize ATS Modal and Bindings
 */
export function initAtsChecker() {
  const openBtn = document.getElementById('ats-checker-btn');
  const modal = document.getElementById('ats-checker-modal');
  const closeBtn = document.getElementById('close-ats-modal-btn');
  const matchJobBtn = document.getElementById('match-job-btn');
  const jobTextarea = document.getElementById('job-description-input');
  let matchUpdateTimeout;
  let resultUpdateTimeout;

  if (jobTextarea) {
    jobTextarea.value = resumeData.meta?.jobDescription || '';
    jobTextarea.addEventListener('input', () => {
      resumeData.meta.jobDescription = jobTextarea.value.slice(0, 5000);
      clearTimeout(matchUpdateTimeout);
      clearTimeout(resultUpdateTimeout);
      if (!modal?.classList.contains('hidden')) {
        resultUpdateTimeout = setTimeout(() => {
          const result = renderJobMatchResults(jobTextarea.value);
          if (result.targets.length) {
            clearTimeout(matchUpdateTimeout);
            matchUpdateTimeout = null;
            recordScoreHistory('job', result.matchPercent);
          }
        }, 180);
      }
      matchUpdateTimeout = setTimeout(saveState, 250);
    });
    const flushJobSave = () => {
      if (matchUpdateTimeout) {
        clearTimeout(matchUpdateTimeout);
        matchUpdateTimeout = null;
        saveState();
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushJobSave();
    });
    window.addEventListener('pagehide', flushJobSave);
  }

  if (modal) {
    subscribe(() => {
      if (!modal.classList.contains('hidden')) {
        if (jobTextarea) jobTextarea.value = resumeData.meta?.jobDescription || '';
        renderAtsAnalysis();
        if (jobTextarea?.value.trim()) renderJobMatchResults(jobTextarea.value);
      }
    });
  }

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      if (jobTextarea) jobTextarea.value = resumeData.meta?.jobDescription || '';
      const score = analyzeAtsCompatibility().score;
      renderAtsAnalysis();
      modal.classList.remove('hidden');
      if (jobTextarea?.value.trim()) renderJobMatchResults(jobTextarea.value);
      recordScoreHistory('ats', score);
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      const fixLink = e.target.closest('[data-ats-fix]');
      if (fixLink) {
        e.preventDefault();
        modal.classList.add('hidden');
        focusAtsField(fixLink.dataset.atsFix);
        return;
      }
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  if (matchJobBtn && jobTextarea) {
    matchJobBtn.addEventListener('click', () => {
      const text = jobTextarea.value;
      const result = renderJobMatchResults(text);
      if (result.targets.length) recordScoreHistory('job', result.matchPercent);
    });
  }
}

function focusAtsField(targetId) {
  const target = document.getElementById(targetId) || document.querySelector(`[data-template="${targetId}"]`);
  if (!target) return;
  const section = target.closest('.section-card');
  section?.querySelector('.accordion-content')?.classList.remove('hidden');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = target.matches('input, textarea, button') ? target : target.querySelector('input, textarea, button');
  focusable?.focus({ preventScroll: true });
}

function recordScoreHistory(type, score) {
  const history = Array.isArray(resumeData.meta.atsScoreHistory) ? resumeData.meta.atsScoreHistory : [];
  resumeData.meta.atsScoreHistory = [...history, { type, score, timestamp: new Date().toISOString() }].slice(-5);
  saveState();
}

function renderScoreHistory() {
  const historyContainer = document.getElementById('ats-score-history');
  if (!historyContainer) return;
  const history = resumeData.meta?.atsScoreHistory || [];
  historyContainer.innerHTML = history.length
    ? `<div class="mt-3 border-t border-slate-200 dark:border-slate-700 pt-2"><span class="text-[10px] font-semibold uppercase text-slate-500">Recent scores</span><div class="mt-1 flex flex-wrap gap-x-3 gap-y-1">${history.slice(-5).reverse().map(entry => `<span class="text-[10px] text-slate-500">${entry.type === 'ats' ? 'ATS' : 'Job'} ${entry.score}% · ${escapeHtml(new Date(entry.timestamp).toLocaleDateString())}</span>`).join('')}</div></div>`
    : '';
}

/**
 * Render the ATS score, warnings, and passed items in the modal
 */
export function renderAtsAnalysis() {
  const scoreElem = document.getElementById('ats-modal-score');
  const statusElem = document.getElementById('ats-score-status');
  const issuesList = document.getElementById('ats-issues-list');
  const passesList = document.getElementById('ats-passes-list');

  if (!scoreElem || !issuesList) return;

  const { score, issues, passes } = analyzeAtsCompatibility();
  renderScoreHistory();

  scoreElem.textContent = `${score}/100`;

  if (score >= 85) {
    scoreElem.className = 'text-2xl font-black text-emerald-600 dark:text-emerald-400 font-heading';
    statusElem.textContent = 'Excellent — Highly ATS Compatible';
    statusElem.className = 'text-xs font-semibold text-emerald-600 dark:text-emerald-400';
  } else if (score >= 65) {
    scoreElem.className = 'text-2xl font-black text-amber-600 dark:text-amber-400 font-heading';
    statusElem.textContent = 'Moderate — Minor ATS Optimizations Needed';
    statusElem.className = 'text-xs font-semibold text-amber-600 dark:text-amber-400';
  } else {
    scoreElem.className = 'text-2xl font-black text-rose-600 dark:text-rose-400 font-heading';
    statusElem.textContent = 'Needs Attention — ATS Parsing Risks Found';
    statusElem.className = 'text-xs font-semibold text-rose-600 dark:text-rose-400';
  }

  // Render Issues
  if (issues.length === 0) {
    issuesList.innerHTML = '<div class="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">No ATS formatting risks detected!</div>';
  } else {
    issuesList.innerHTML = issues.map(iss => `
      <div class="p-3 rounded-lg border text-xs ${iss.type === 'error' ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-300' : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300'}">
        <div class="font-bold flex items-center gap-1.5 mb-0.5">
          <span>${iss.type === 'error' ? '🚫' : '⚠️'}</span>
          <span>${escapeHtml(iss.title)}</span>
        </div>
        <p class="leading-relaxed opacity-90">${escapeHtml(iss.desc)}</p>
        ${iss.recommendation ? `<p class="mt-1.5 pt-1.5 border-t border-current/10 font-semibold opacity-80">💡 Recommendation: ${escapeHtml(iss.recommendation)}</p>` : ''}
        ${typeof iss.scoreImpact === 'number' ? `<p class="mt-1 text-[11px] font-bold uppercase tracking-wide opacity-70">ATS Impact: -${iss.scoreImpact} points</p>` : ''}
        ${iss.fixTarget ? `<a href="#${escapeHtml(iss.fixTarget)}" data-ats-fix="${escapeHtml(iss.fixTarget)}" class="inline-block mt-1.5 font-semibold underline underline-offset-2">How to fix</a>` : ''}
      </div>
    `).join('');
  }

  // Render Passes
  if (passesList) {
    passesList.innerHTML = passes.map(p => `
      <div class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
        <span class="text-emerald-500 font-bold">✓</span>
        <div>
          <span class="font-semibold text-slate-900 dark:text-white">${escapeHtml(p.title)}:</span>
          <span class="text-slate-600 dark:text-slate-400"> ${escapeHtml(p.desc)}</span>
        </div>
      </div>
    `).join('');
  }
}

/**
 * Render the Job Description Keyword Match Results
 */
function renderJobMatchResults(jobText) {
  const resultsContainer = document.getElementById('job-match-results');
  if (!resultsContainer) return { matchPercent: 0, targets: [], matchedKeywords: [], missingKeywords: [], categoryBreakdown: [] };

  const trimmedLength = jobText.trim().split(/\s+/).length;
  const { matchPercent, matchedKeywords, missingKeywords, categoryBreakdown, targets } = matchJobDescription(jobText);

  if (matchedKeywords.length === 0 && missingKeywords.length === 0) {
    const message = trimmedLength < 15
      ? 'That looks too short to be a full job description. Paste the complete posting (responsibilities, requirements, skills) for an accurate match.'
      : 'No recognized job-related keywords detected. Try pasting a complete posting with role-specific skills and responsibilities.';

    resultsContainer.innerHTML = `
      <div class="p-3 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg text-center border border-amber-200 dark:border-amber-800">
        ⚠️ ${message}
      </div>
    `;
    return { matchPercent, matchedKeywords, missingKeywords, categoryBreakdown, targets };
  }
  const requiredTargets = targets.filter(target => target.required);
  const requiredMatched = matchedKeywords.filter(target => target.required).length;

  resultsContainer.innerHTML = `
    <div class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Job Match Score</span>
        <span class="text-base font-black px-2.5 py-0.5 rounded-full ${matchPercent >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}">
          ${matchPercent}% Match
        </span>
      </div>

      <div class="text-[11px] text-slate-600 dark:text-slate-400">Required skills matched: ${requiredMatched}/${requiredTargets.length}</div>

      <div class="border-t border-slate-200 dark:border-slate-700 pt-2">
        <div class="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">Score by category</div>
        <div class="space-y-1.5">
          ${categoryBreakdown.map(category => `
            <div class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-[11px]">
              <span class="capitalize text-slate-600 dark:text-slate-400">${escapeHtml(category.category.replace(/-/g, ' '))}</span>
              <span class="tabular-nums text-slate-700 dark:text-slate-300">${category.matched}/${category.total} · ${category.score}%</span>
              ${category.matched < category.total ? '<a href="#skill-input" data-ats-fix="skill-input" class="font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2">How to fix</a>' : '<span></span>'}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Matched Keywords -->
      <div>
        <div class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
          <span>✓</span> Found in Resume (${matchedKeywords.length})
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${matchedKeywords.map(target => `
            <span class="px-2 py-0.5 text-xs rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
              ${escapeHtml(target.label)}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Missing Keywords -->
      ${missingKeywords.length > 0 ? `
        <div class="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div class="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
            <span>⚠️</span> Missing from Resume (${missingKeywords.length}) — Click to add:
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${missingKeywords.map(target => `
              <div class="inline-flex items-center gap-1.5">
                <button type="button" class="add-missing-kw-btn px-2 py-0.5 text-xs rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1" data-kw="${escapeHtml(target.key)}" data-label="${escapeHtml(target.label)}">
                  <span>+</span> <span>${escapeHtml(target.label)}</span>${target.required ? '<span class="text-[9px] uppercase">Required</span>' : ''}
                </button>
                <a href="#skill-input" data-ats-fix="skill-input" class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2">How to fix</a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Bind clicks to add missing keywords to resumeData.skills
  const addButtons = resultsContainer.querySelectorAll('.add-missing-kw-btn');
  addButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const kw = btn.dataset.kw;
      if (kw && !resumeData.skills.some(skill => skill.toLowerCase() === kw.toLowerCase())) {
        const formattedKw = btn.dataset.label || kw;
        resumeData.skills.push(formattedKw);
        saveState();
        btn.classList.replace('bg-amber-50', 'bg-emerald-50');
        btn.classList.replace('text-amber-800', 'text-emerald-700');
        btn.textContent = `✓ ${formattedKw}`;
        btn.disabled = true;
      }
    });
  });
  return { matchPercent, matchedKeywords, missingKeywords, categoryBreakdown, targets };
}