/**
 * End-to-End Automated Test Suite for ResumeBuilder Pro
 * Runs headless Chrome via puppeteer-core to test all 14 core features + Phase 5 & 6 capabilities.
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:4173';

const results = [];
function record(testName, passed, details = '') {
  results.push({ testName, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function runTests() {
  console.log('🚀 Starting E2E Browser Test Suite for ResumeBuilder Pro...\n');

  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome executable not found at: ${CHROME_PATH}`);
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.toString()));

  try {
    // 1. Initial Page Load & Empty State
    await page.goto(URL, { waitUntil: 'networkidle0' });
    const pageTitle = await page.title();
    record('Page Title Check', pageTitle.includes('ResumeBuilder Pro'), pageTitle);

    await page.screenshot({ path: 'test_initial_view.png' });

    // 2. Load Sample Data
    const sampleBtn = await page.$('#load-sample-btn');
    if (sampleBtn) {
      await sampleBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const nameVal = await page.$eval('#personal-name', el => el.value);
      record('Sample Data Name Input', nameVal === 'Alexander Morgan', `Got: ${nameVal}`);

      const previewText = await page.$eval('#resume-preview', el => el.textContent);
      record('Preview Rendered Name', previewText.includes('Alexander Morgan'), 'Found name in A4 preview');

      const scoreText = await page.$eval('#completeness-score', el => el.textContent);
      const scoreVal = parseInt(scoreText, 10);
      record('Completeness Score Calculated', scoreVal >= 85, `Score: ${scoreText}`);

      await page.screenshot({ path: 'test_sample_loaded.png' });
    } else {
      record('Load Sample Button Found', false, 'Missing #load-sample-btn');
    }

    // 3. Template Switching: Executive (Two-Column)
    await page.click('[data-template="template2"]');
    await new Promise(r => setTimeout(r, 300));
    const isExecutive = await page.$eval('#resume-preview aside', el => Boolean(el)).catch(() => false);
    record('Template 2 (Executive Split) Render', isExecutive, 'Sidebar aside rendered');
    await page.screenshot({ path: 'test_template_executive.png' });

    // Template 3: Tech Specialist
    await page.click('[data-template="template3"]');
    await new Promise(r => setTimeout(r, 300));
    const isTech = await page.$eval('#resume-preview header', el => el.classList.contains('bg-slate-900')).catch(() => false);
    record('Template 3 (Tech Specialist) Render', isTech, 'Dark tech header rendered');
    await page.screenshot({ path: 'test_template_tech.png' });

    // Template 4: Classic Elegance
    await page.click('[data-template="template4"]');
    await new Promise(r => setTimeout(r, 300));
    const previewFont = await page.$eval('#resume-preview > div', el => el.getAttribute('style') || '');
    record('Template 4 (Classic Elegance) Render', previewFont.includes('serif'), 'Serif font applied');
    await page.screenshot({ path: 'test_template_classic.png' });

    // Switch back to Template 1 (Modern)
    await page.click('[data-template="template1"]');
    await new Promise(r => setTimeout(r, 200));

    // 4. Accent Color Swatch Switching
    await page.click('[data-color="#059669"]'); // Emerald
    await new Promise(r => setTimeout(r, 200));
    const colorApplied = await page.$eval('#resume-preview', el => el.innerHTML.includes('#059669'));
    record('Accent Color Update', colorApplied, 'Emerald #059669 active in DOM');

    // 5. Skills Tag Input & Suggestions
    const initialSkillCount = await page.$$eval('#skills-chip-container .skill-chip', chips => chips.length);
    await page.type('#skill-input', 'Kubernetes');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 200));

    const newSkillCount = await page.$$eval('#skills-chip-container .skill-chip', chips => chips.length);
    record('Skill Tag Addition via Enter', newSkillCount === initialSkillCount + 1, `Count: ${initialSkillCount} -> ${newSkillCount}`);

    // Quick suggestion click
    const suggestBtn = await page.$('#skill-suggestions button');
    if (suggestBtn) {
      await suggestBtn.click();
      await new Promise(r => setTimeout(r, 200));
      const afterSuggestCount = await page.$$eval('#skills-chip-container .skill-chip', chips => chips.length);
      record('Skill Tag Addition via Suggestion', afterSuggestCount >= newSkillCount, `Count: ${afterSuggestCount}`);
    }

    // 6. ATS Compatibility Checker & Job Keyword Matcher
    await page.click('#ats-checker-btn');
    await new Promise(r => setTimeout(r, 300));
    const modalVisible = await page.$eval('#ats-checker-modal', el => !el.classList.contains('hidden'));
    record('ATS Checker Modal Open', modalVisible, 'Modal is visible');

    const atsScoreText = await page.$eval('#ats-modal-score', el => el.textContent.trim());
    record('ATS Score Evaluated', atsScoreText.includes('/100'), `ATS Score: ${atsScoreText}`);

    // Paste Job Description
    const sampleJob = "We are seeking a Senior Engineer with proficiency in React, TypeScript, GraphQL, Docker, Python, AWS, and Kubernetes to lead microservices development.";
    await page.type('#job-description-input', sampleJob);
    await page.click('#match-job-btn');
    await new Promise(r => setTimeout(r, 400));

    const jobMatchBadge = await page.$eval('#job-match-results', el => el.textContent);
    const hasJobMatch = jobMatchBadge.includes('% Match') && jobMatchBadge.includes('Found in Resume');
    record('Job Description Keyword Matcher', hasJobMatch, 'Found matching keywords & calculated match score');

    await page.screenshot({ path: 'test_ats_matcher.png' });

    // Close ATS Modal
    await page.click('#close-ats-modal-btn');
    await new Promise(r => setTimeout(r, 200));

    // 7. Input Validation: Email format check
    await page.$eval('#personal-email', el => el.value = 'invalid-email');
    await page.type('#personal-email', ' ');
    await new Promise(r => setTimeout(r, 300));
    const emailErr = await page.$eval('#email-validation-msg', el => el.textContent);
    record('Email Validation Warning', emailErr.includes('valid email'), `Warning: ${emailErr}`);

    await page.$eval('#personal-email', el => el.value = 'alex.morgan@example.com');
    await page.type('#personal-email', ' ');
    await new Promise(r => setTimeout(r, 300));
    const emailOk = await page.$eval('#email-validation-msg', el => el.textContent);
    record('Email Validation Success', emailOk.includes('Valid email'), `Success: ${emailOk}`);

    // 8. Summary Character Counter
    const summaryCounter = await page.$eval('#summary-char-counter', el => el.textContent);
    record('Summary Character Counter Live', summaryCounter.includes('/ 450 characters'), summaryCounter);

    // 9. Keyboard / Accessible Section Reordering (Up/Down Buttons)
    const orderBefore = await page.$$eval('#sections-accordion-container .section-card', cards => cards.map(c => c.dataset.section));
    const downButtons = await page.$$('.move-section-down');
    if (downButtons.length > 0) {
      await downButtons[0].click();
      await new Promise(r => setTimeout(r, 300));
      const orderAfter = await page.$$eval('#sections-accordion-container .section-card', cards => cards.map(c => c.dataset.section));
      record('Keyboard Move-Down Section Reorder', orderBefore[0] !== orderAfter[0], `1st section: ${orderBefore[0]} -> ${orderAfter[0]}`);
    }

    // 10. Dark Mode Theme Toggle
    await page.click('#theme-toggle-btn');
    await new Promise(r => setTimeout(r, 250));
    const isDark = await page.$eval('html', el => el.classList.contains('dark'));
    record('Dark Mode Toggle', isDark, 'HTML element has .dark class');
    await page.screenshot({ path: 'test_dark_mode.png' });

    // Toggle back to light
    await page.click('#theme-toggle-btn');
    await new Promise(r => setTimeout(r, 200));

    // 11. Print / Save as PDF control
    const printButton = await page.$('#print-pdf-btn');
    const printButtonLabel = await page.$eval('#print-pdf-btn', el => el.textContent.trim());
    record('Print / Save as PDF Button', Boolean(printButton) && printButtonLabel.includes('Print / Save as PDF'), 'Native print dialog control is available');

    // 12. Check for unexpected console errors
    const fatalErrors = pageErrors.concat(consoleLogs.filter(l => l.startsWith('[error]')));
    record('Zero Fatal Browser Errors', fatalErrors.length === 0, fatalErrors.length === 0 ? 'No console errors' : fatalErrors.join(' | '));

  } catch (err) {
    console.error('❌ Test execution encountered an exception:', err);
    record('Test Suite Completion', false, err.message);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n========================================');
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  console.log(`Test Results: ${passedCount} / ${totalCount} PASSED (${Math.round((passedCount/totalCount)*100)}%)`);
  console.log('========================================\n');

  return { passedCount, totalCount, results };
}

runTests().then(({ passedCount, totalCount }) => {
  process.exit(passedCount === totalCount ? 0 : 1);
});
