import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEmail, validatePhone } from '../js/validators.js';
import { matchJobDescription } from '../js/atsChecker.js';
import { parseStateFromJson, resumeData } from '../js/state.js';
import { escapeHtml, safeUrl } from '../js/utils.js';
import { template1 } from '../js/templates.js';

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
    assert.deepEqual(result.matchedKeywords, ['react', '.net', 'rest api']);
    assert.deepEqual(result.missingKeywords, ['patient care', 'nursing']);
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
      sectionOrder: ['skills', 'skills', 'unknown']
    }
  }));

  assert.equal(normalized.personal.name.length, 5000);
  assert.equal(normalized.skills.length, 50);
  assert.equal(normalized.meta.template, 'template1');
  assert.equal(normalized.meta.accentColor, '#4f46e5');
  assert.equal(normalized.meta.theme, undefined);
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
