import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEmail, validatePhone } from '../js/validators.js';
import { matchJobDescription } from '../js/atsChecker.js';
import { parseStateFromJson, resumeData } from '../js/state.js';
import { escapeHtml, safeUrl } from '../js/utils.js';
import { template1 } from '../js/templates.js';
import { analyzeBulletQuality, analyzeFormatQuality, extractJobKeywords, matchJobDescription as matchWeightedJobDescription } from '../js/atsEngine.js';

test('validateEmail treats typo suggestions as soft warnings', () => {
  assert.deepEqual(validateEmail('user@gmail.co'), { valid: true, warning: 'Did you mean @gmail.com?' });
  assert.deepEqual(validateEmail('user@gmail.cm'), { valid: true, warning: 'Did you mean @gmail.com?' });
  assert.deepEqual(validateEmail('user@gmail.com'), { valid: true });
});

test('validateEmail accepts valid domains outside an allowlist', () => {
  assert.deepEqual(validateEmail('alex.morgan@example.co'), { valid: true });
  assert.deepEqual(validateEmail('user@yahoo.co.uk'), { valid: true });
  assert.deepEqual(validateEmail('user@hotmail.co.uk'), { valid: true });
  assert.deepEqual(validateEmail('joy@gmail.con'), { valid: true, warning: 'Did you mean @gmail.com?' });
  assert.equal(validateEmail('user@example.c').valid, false);
  assert.equal(validateEmail('user@localhost').valid, false);
});

test('validatePhone enforces known lengths and soft-passes unknown countries', () => {
  assert.deepEqual(validatePhone('+8801712345678'), { valid: true });
  assert.deepEqual(validatePhone('+88001712345678'), { valid: true });
  assert.deepEqual(validatePhone('+880171234567'), {
    valid: false,
    message: 'Bangladesh numbers need 10 digits after +880 — you entered 9'
  });

  assert.deepEqual(validatePhone('+911234567890'), { valid: true });
  assert.deepEqual(validatePhone('+1 415 555 2671'), { valid: true });
  assert.deepEqual(validatePhone('+358401234567'), {
    valid: true,
    warning: 'Check that the country code and number are correct.'
  });
});

test('matchJobDescription uses job keywords and all resume sections', () => {
  const previousState = JSON.stringify(resumeData);
  Object.assign(resumeData, {
    personal: { name: '', title: '.NET developer', email: '', phone: '', location: '', summary: '' },
    education: [{ school: '', degree: 'REST API design', year: '', grade: '' }],
    experience: [],
    skills: ['React'],
    projects: [],
    achievements: [],
    meta: { template: 'template1', accentColor: '#4f46e5', sectionOrder: [] }
  });

  try {
    const result = matchJobDescription('React, .NET, REST APIs, nursing, and patient care');
    assert.deepEqual(result.matchedKeywords.map(target => target.key).sort(), ['.net', 'react', 'rest api']);
    assert.deepEqual(result.missingKeywords.map(target => target.key).sort(), ['nursing', 'patient care']);
    assert.equal(result.matchPercent, 60);
  } finally {
    Object.assign(resumeData, JSON.parse(previousState));
  }
});

test('safeUrl permits web and email links and rejects executable protocols', () => {
  assert.equal(safeUrl('github.com/me'), 'https://github.com/me');
  assert.equal(safeUrl('mailto:person@example.com'), 'mailto:person@example.com');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('//attacker.example'), '');
});

test('import normalization clamps content and repairs metadata', () => {
  const normalized = parseStateFromJson(JSON.stringify({
    personal: { name: 'x'.repeat(6000) },
    skills: Array(60).fill('skill'),
    links: { github: 'javascript:alert(1)' },
    meta: {
      template: 'unknown-template',
      accentColor: '#fff; background:url(javascript:alert(1))',
      theme: 'dark',
      sectionOrder: ['skills', 'skills', 'unknown'],
      atsScoreHistory: [
        ...Array.from({ length: 6 }, (_, index) => ({ type: 'ats', score: index * 10, timestamp: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z` })),
        { type: 'invalid', score: 100, timestamp: '2026-10-01T00:00:00.000Z' }
      ]
    }
  }));

  assert.equal(normalized.personal.name.length, 5000);
  assert.equal(normalized.skills.length, 50);
  assert.equal(normalized.meta.template, 'template1');
  assert.equal(normalized.meta.accentColor, '#4f46e5');
  assert.equal(normalized.meta.theme, undefined);
  assert.deepEqual(normalized.meta.atsScoreHistory.map(entry => entry.score), [10, 20, 30, 40, 50]);
  assert.deepEqual(normalized.meta.sectionOrder, ['personal', 'skills', 'experience', 'education', 'projects', 'achievements', 'links']);
});

test('template output escapes imported text and omits unsafe links', () => {
  const output = template1({
    personal: { name: '<img src=x onerror=alert(1)>' },
    links: { linkedin: 'javascript:alert(1)' },
    skills: [],
    experience: [],
    education: [],
    projects: [],
    achievements: [],
    meta: { accentColor: '#4f46e5', sectionOrder: ['personal'] }
  });

  assert.equal(output.includes('<img src=x onerror=alert(1)>'), false);
  assert.equal(output.includes('href="javascript:'), false);
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
});

test('generic extraction ranks phrases, applies required weights, and resolves aliases', () => {
  const targets = extractJobKeywords(`Responsibilities:
Lead stakeholder engagement and support campaign planning.
Requirements:
Use JS, k8s, and stakeholder engagement for market research.
Qualifications:
Financial modeling experience.
Preferred:
Figma experience.`, 80);
  const byKey = new Map(targets.map(target => [target.key, target]));

  assert.equal(byKey.get('javascript').label, 'JavaScript');
  assert.equal(byKey.get('kubernetes').label, 'Kubernetes');
  assert.equal(byKey.get('market research').category, 'marketing');
  assert.equal(byKey.get('financial modeling').category, 'finance');
  assert.equal(byKey.get('figma').required, false);
  assert.equal(byKey.get('javascript').weight, 2);
  assert.ok(byKey.get('stakeholder engagement').frequency >= 2);
  assert.ok(targets.every(target => target.key.split(' ').length <= 3));
});

test('weighted matching recognizes plural and inflected forms', () => {
  const result = matchWeightedJobDescription('Requirements:\nREST APIs, managed campaigns, studied workflows, and coordinating departments', {
    personal: { title: '' },
    skills: ['REST API', 'manage campaign', 'study workflow', 'coordinate department'],
    experience: [],
    education: [],
    projects: [],
    achievements: [],
    links: {}
  });

  assert.ok(result.matchPercent > 0);
  assert.ok(result.matchedKeywords.some(target => target.key === 'rest api'));
  assert.ok(result.matchedKeywords.some(target => target.key === 'campaign management'));
  assert.ok(result.matchedKeywords.some(target => target.key === 'studied workflows'));
  assert.ok(result.matchedKeywords.some(target => target.key === 'coordinating departments'));
  assert.ok(result.categoryBreakdown.some(category => category.category === 'marketing'));
});

test('bullet diagnostics flag weak, unmeasured, long, and repeated bullets', () => {
  const findings = analyzeBulletQuality({
    experience: [{
      role: 'Coordinator',
      company: 'Example',
      description: '• Responsible for coordinating a broad range of complex activities across several departments and supporting operational delivery in multiple locations throughout the entire organization and across every regional office.\n• Responsible for preparing weekly status updates and coordinating project work.'
    }]
  });
  const titles = findings.map(finding => finding.title);

  assert.ok(titles.includes('Strengthen a weak bullet opening'));
  assert.ok(titles.includes('Add a measurable result'));
  assert.ok(titles.includes('Shorten a long bullet'));
  assert.ok(titles.includes('Vary repeated opening verbs'));
});

test('format diagnostics flag emojis, date inconsistency, long summaries, and missing links', () => {
  const findings = analyzeFormatQuality({
    personal: { summary: `📊 ${'A'.repeat(460)}` },
    experience: [{ duration: '2020-2022' }],
    education: [{ year: 'Jan 2021' }],
    links: { linkedin: '', github: '', portfolio: '' }
  });
  const titles = findings.map(finding => finding.title);

  assert.ok(titles.includes('Remove emoji characters'));
  assert.ok(titles.includes('Shorten the professional summary'));
  assert.ok(titles.includes('Use a consistent date format'));
  assert.ok(titles.includes('Add a professional link'));
});
