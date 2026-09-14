/**
 * ATS Compatibility Checker & Job Description Keyword Matcher Module
 * Evaluates resumes for Applicant Tracking System (ATS) readability and matches keywords from job postings.
 */

import { resumeData, saveState } from './state.js';

// Templates that use a two-column layout. Two-column resumes can cause
// reading-order problems for some ATS parsers (left column may be read
// completely before the right column, or sections may be read out of order).
// NOTE: Based on templates.js, Template 2 ("Executive Split") is the only
// two-column layout (aside w-1/3 + main w-2/3). Templates 1, 3, and 4 are
// single-column. Update this set if new templates are added.
const TWO_COLUMN_TEMPLATES = new Set(['template2']);

// Common technical and professional keywords list for extraction
const TECH_KEYWORDS_DICTIONARY = [
  'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular', 'node.js', 'express',
  'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'c++', 'c#', '.net', 'golang', 'rust',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd', 'git', 'github',
  'graphql', 'rest api', 'microservices', 'distributed systems', 'system design',
  'html5', 'css3', 'tailwind css', 'sass', 'webpack', 'vite',
  'jest', 'cypress', 'playwright', 'tdd', 'agile', 'scrum', 'jira',
  'machine learning', 'artificial intelligence', 'data science', 'analytics'
];

/**
 * Calculates ATS readiness score and generates a list of actionable warnings
 */
export function analyzeAtsCompatibility() {
  const issues = [];
  const passes = [];
  let score = 100;

  const { personal, education, experience, skills, meta } = resumeData;

  // 1. Template Layout Check (Two-column reading-order risk)
  const isTwoColumnTemplate = TWO_COLUMN_TEMPLATES.has(meta?.template);

  if (isTwoColumnTemplate) {
    const layoutPenalty = 10;
    score -= layoutPenalty;
    issues.push({
      type: 'warning',
      title: '⚠️ Two-Column Layout Detected',
      desc: 'Your resume uses a two-column layout. Some ATS systems may read the content in the wrong order.',
      recommendation: 'Switch to a single-column template for better ATS compatibility.',
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
      desc: 'An ATS cannot index a candidate without a clear, prominent header name.'
    });
  } else {
    passes.push({
      title: 'Name Present',
      desc: `Identified candidate name: "${personal.name}".`
    });
  }

  // 3. Contact Details
  const hasEmail = Boolean(personal?.email?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email));
  const hasPhone = Boolean(personal?.phone?.trim());

  if (!hasEmail) {
    score -= 15;
    issues.push({
      type: 'error',
      title: 'Missing or Invalid Email',
      desc: 'A valid email address is required for ATS recruiter outreach.'
    });
  }
  if (!hasPhone) {
    score -= 10;
    issues.push({
      type: 'warning',
      title: 'Missing Phone Number',
      desc: 'Recruiters and automated screeners frequently filter candidates without phone contact.'
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
      desc: 'ATS algorithms heavily weigh past job titles, company names, and employment history.'
    });
  } else {
    const hasBullets = validExp.some(e => e.description?.includes('•') || e.description?.includes('-') || (e.description?.length || 0) > 50);
    if (!hasBullets) {
      score -= 10;
      issues.push({
        type: 'warning',
        title: 'Action-Oriented Experience Bullets',
        desc: 'Add bullet points starting with strong action verbs (e.g., "Architected", "Reduced", "Engineered") to maximize keyword parsing.'
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
      desc: `Only ${validSkills.length} skill(s) detected. ATS systems match resumes against job descriptions by keyword frequency. Aim for 8-15 core skills.`
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
      desc: 'Many ATS filters require degree or educational institution validation.'
    });
  } else {
    passes.push({
      title: 'Education Verified',
      desc: 'Degree and institution details are clear.'
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    passes
  };
}

/**
 * Matches pasted job description against resume skills and content
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsKeyword(fullText, keyword) {
  const cleanKeyword = keyword.trim().toLowerCase();
  if (!cleanKeyword) return false;
  
  // For keywords containing non-word symbols like c++, c#, .net
  if (/[+#]/.test(cleanKeyword)) {
    const escaped = escapeRegExp(cleanKeyword);
    const regex = new RegExp(`(^|\\s|[,.;:/()[\\]])${escaped}($|\\s|[,.;:/()[\\]])`, 'i');
    return regex.test(fullText);
  }
  
  const escaped = escapeRegExp(cleanKeyword);
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(fullText);
}

export function matchJobDescription(jobDescText) {
  if (!jobDescText || !jobDescText.trim()) {
    return { matchPercent: 0, matchedKeywords: [], missingKeywords: [] };
  }

  const normalizedJobText = jobDescText.toLowerCase();

  // Combine all resume text for keyword search
  const resumeTextParts = [
    resumeData.personal?.summary || '',
    ...(resumeData.skills || []),
    ...(resumeData.experience || []).map(e => `${e.role} ${e.company} ${e.description}`),
    ...(resumeData.projects || []).map(p => `${p.title} ${p.description}`)
  ];
  const combinedResumeText = resumeTextParts.join(' ').toLowerCase();

  // Extract detected keywords from job description
  const detectedJobKeywords = new Set();

  TECH_KEYWORDS_DICTIONARY.forEach(kw => {
    if (containsKeyword(normalizedJobText, kw)) {
      detectedJobKeywords.add(kw);
    }
  });

  // Also extract any capitalized words or phrases in job description that match resume skills
  (resumeData.skills || []).forEach(s => {
    if (s.trim().length > 2) {
      if (containsKeyword(normalizedJobText, s)) {
        detectedJobKeywords.add(s.toLowerCase());
      }
    }
  });

  const allTargetKeywords = Array.from(detectedJobKeywords);
  if (allTargetKeywords.length === 0) {
    return { matchPercent: 0, matchedKeywords: [], missingKeywords: [] };
  }

  const matchedKeywords = [];
  const missingKeywords = [];

  allTargetKeywords.forEach(kw => {
    const isMatchedInResume = (resumeData.skills || []).some(s => s.toLowerCase() === kw) ||
      containsKeyword(combinedResumeText, kw);

    if (isMatchedInResume) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });


  const matchPercent = Math.round((matchedKeywords.length / allTargetKeywords.length) * 100);

  return {
    matchPercent,
    matchedKeywords,
    missingKeywords
  };
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

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      renderAtsAnalysis();
      modal.classList.remove('hidden');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  if (matchJobBtn && jobTextarea) {
    matchJobBtn.addEventListener('click', () => {
      const text = jobTextarea.value;
      renderJobMatchResults(text);
    });
  }
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
          <span>${iss.title}</span>
        </div>
        <p class="leading-relaxed opacity-90">${iss.desc}</p>
        ${iss.recommendation ? `<p class="mt-1.5 pt-1.5 border-t border-current/10 font-semibold opacity-80">💡 Recommendation: ${iss.recommendation}</p>` : ''}
        ${typeof iss.scoreImpact === 'number' ? `<p class="mt-1 text-[11px] font-bold uppercase tracking-wide opacity-70">ATS Impact: -${iss.scoreImpact} points</p>` : ''}
      </div>
    `).join('');
  }

  // Render Passes
  if (passesList) {
    passesList.innerHTML = passes.map(p => `
      <div class="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
        <span class="text-emerald-500 font-bold">✓</span>
        <div>
          <span class="font-semibold text-slate-900 dark:text-white">${p.title}:</span>
          <span class="text-slate-600 dark:text-slate-400"> ${p.desc}</span>
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
  if (!resultsContainer) return;

  const trimmedLength = jobText.trim().split(/\s+/).length;
  const { matchPercent, matchedKeywords, missingKeywords } = matchJobDescription(jobText);

  if (matchedKeywords.length === 0 && missingKeywords.length === 0) {
    const message = trimmedLength < 15
      ? 'That looks too short to be a full job description. Paste the complete posting (responsibilities, requirements, skills) for an accurate match.'
      : 'No recognized technical keywords detected. Try pasting a job description that lists specific skills or technologies.';

    resultsContainer.innerHTML = `
      <div class="p-3 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg text-center border border-amber-200 dark:border-amber-800">
        ⚠️ ${message}
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = `
    <div class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Job Match Score</span>
        <span class="text-base font-black px-2.5 py-0.5 rounded-full ${matchPercent >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}">
          ${matchPercent}% Match
        </span>
      </div>

      <!-- Matched Keywords -->
      <div>
        <div class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
          <span>✓</span> Found in Resume (${matchedKeywords.length})
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${matchedKeywords.map(kw => `
            <span class="px-2 py-0.5 text-xs rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
              ${kw}
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
            ${missingKeywords.map(kw => `
              <button type="button" class="add-missing-kw-btn px-2 py-0.5 text-xs rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1" data-kw="${kw}">
                <span>+</span> <span>${kw}</span>
              </button>
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
      if (kw && !resumeData.skills.includes(kw)) {
        // Capitalize nicely
        const formattedKw = kw.charAt(0).toUpperCase() + kw.slice(1);
        resumeData.skills.push(formattedKw);
        saveState();
        btn.classList.replace('bg-amber-50', 'bg-emerald-50');
        btn.classList.replace('text-amber-800', 'text-emerald-700');
        btn.innerHTML = `<span>✓</span> <span>${formattedKw}</span>`;
        btn.disabled = true;
      }
    });
  });
}