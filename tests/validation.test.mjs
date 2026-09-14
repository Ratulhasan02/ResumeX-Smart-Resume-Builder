import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEmail, validatePhone } from '../js/formHandlers.js';

test('validateEmail flags common domain typos', () => {
  assert.deepEqual(validateEmail('user@gmail.co'), {
    valid: false,
    message: 'Did you mean @gmail.com?'
  });

  assert.deepEqual(validateEmail('user@gmail.cm'), {
    valid: false,
    message: 'Did you mean @gmail.com?'
  });

  assert.deepEqual(validateEmail('user@gmail.com'), { valid: true });
});

test('validateEmail rejects invalid and unrecognized TLDs', () => {
  assert.deepEqual(validateEmail('user@example.c'), {
    valid: false,
    message: '".c" isn\'t a recognized domain ending'
  });

  assert.deepEqual(validateEmail('joy@gmail.con'), {
    valid: false,
    message: 'Did you mean @gmail.com?'
  });

  assert.deepEqual(validateEmail('user@example.zz'), {
    valid: false,
    message: '".zz" isn\'t a recognized domain ending'
  });

  assert.deepEqual(validateEmail('alex.morgan@example.co'), {
    valid: false,
    message: '".co" isn\'t a recognized domain ending'
  });
});

test('validatePhone enforces country-specific length rules', () => {
  assert.deepEqual(validatePhone('+8801712345678'), { valid: true });
  assert.deepEqual(validatePhone('+880171234567'), {
    valid: false,
    message: 'Bangladesh numbers need 10 digits after +880 — you entered 9'
  });

  assert.deepEqual(validatePhone('+911234567890'), { valid: true });
  assert.deepEqual(validatePhone('+1 415 555 2671'), { valid: true });
});
