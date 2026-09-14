/**
 * Resume Completeness Module
 * Evaluates filled sections and calculates an overall profile score (0 - 100%)
 * Displays dynamic feedback and suggestions to guide the user.
 */

import { resumeData } from './state.js';

export function calculateCompleteness() {
  let score = 0;
  const tips = [];

  const { personal, education, experience, skills, projects, achievements, links } = resumeData;

  // 1. Personal Details (Max 35 pts)
  if (personal?.name?.trim()) score += 10;
  else tips.push("Add your full name");

  if (personal?.email?.trim()) score += 8;
  else tips.push("Add an email address");

  if (personal?.phone?.trim()) score += 5;
  else tips.push("Add a contact phone number");

  if (personal?.location?.trim()) score += 4;

  if (personal?.summary?.trim() && personal.summary.trim().length > 30) score += 8;
  else tips.push("Write a compelling professional summary");

  // 2. Experience (Max 25 pts)
  const validExp = (experience || []).filter(e => e.company?.trim() && e.role?.trim());
  if (validExp.length >= 1) {
    score += 15;
    if (validExp.some(e => e.description?.trim().length > 20)) {
      score += 10;
    } else {
      tips.push("Add impact bullet points to your work experience");
    }
  } else {
    tips.push("Add at least one work experience");
  }

  // 3. Education (Max 15 pts)
  const validEdu = (education || []).filter(e => e.school?.trim() && e.degree?.trim());
  if (validEdu.length >= 1) {
    score += 15;
  } else {
    tips.push("Add your education details");
  }

  // 4. Skills (Max 10 pts)
  const validSkills = (skills || []).filter(s => s?.trim());
  if (validSkills.length >= 5) {
    score += 10;
  } else if (validSkills.length >= 2) {
    score += 6;
    tips.push("Add at least 5 skills to stand out");
  } else {
    tips.push("Add key technical or industry skills");
  }

  // 5. Projects or Achievements (Max 10 pts)
  const validProj = (projects || []).filter(p => p.title?.trim());
  const validAch = (achievements || []).filter(a => a.title?.trim());
  if (validProj.length >= 1 || validAch.length >= 1) {
    score += 10;
  } else {
    tips.push("Add a project or notable achievement");
  }

  // 6. Links (Max 5 pts)
  if (links?.linkedin?.trim() || links?.github?.trim() || links?.portfolio?.trim()) {
    score += 5;
  } else {
    tips.push("Include a LinkedIn or portfolio link");
  }

  return {
    score: Math.min(100, score),
    tips
  };
}

/**
 * Updates completeness gauge in the UI
 */
export function updateCompletenessUI() {
  const scoreLabel = document.getElementById('completeness-score');
  const progressBar = document.getElementById('completeness-bar');
  const tipsContainer = document.getElementById('completeness-tips');

  if (!scoreLabel || !progressBar) return;

  const { score, tips } = calculateCompleteness();

  scoreLabel.textContent = `${score}%`;
  progressBar.style.width = `${score}%`;

  // Color gradient based on score
  progressBar.className = 'h-full transition-all duration-500 rounded-full ';
  if (score < 40) {
    progressBar.classList.add('bg-rose-500');
  } else if (score < 75) {
    progressBar.classList.add('bg-amber-500');
  } else {
    progressBar.classList.add('bg-emerald-500');
  }

  if (tipsContainer) {
    if (tips.length === 0) {
      tipsContainer.innerHTML = '<div class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">🎉 Outstanding! Your resume profile is complete.</div>';
    } else {
      const topTips = tips.slice(0, 2);
      tipsContainer.innerHTML = topTips.map(t => `
        <div class="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>${t}</span>
        </div>
      `).join('');
    }
  }
}
