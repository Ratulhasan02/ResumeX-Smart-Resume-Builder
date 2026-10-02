const commonEmailProviders = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'live.com', 'protonmail.com'
];

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

function editDistance(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      diagonal = previous;
    }
  }
  return row[right.length];
}

export function validateEmail(email = '') {
  const trimmed = String(email || '').trim();
  if (!trimmed) return { valid: false };
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]{2,})+$/.test(trimmed)) {
    return { valid: false, message: 'Invalid email format' };
  }

  const domain = trimmed.split('@')[1].toLowerCase();
  const suggestion = commonEmailProviders.find(provider => editDistance(domain, provider) === 1);
  return suggestion
    ? { valid: true, warning: `Did you mean @${suggestion}?` }
    : { valid: true };
}

export function validatePhone(phone = '') {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return { valid: false };

  const cleaned = trimmed.replace(/[\s\-().]/g, '');
  if (!/^\+\d{7,15}$/.test(cleaned)) {
    return { valid: false, message: 'Enter a phone number with country code and 7-15 digits' };
  }

  const matchedCode = Object.keys(countryPhoneRules)
    .sort((left, right) => right.length - left.length)
    .find(code => cleaned.startsWith(code));
  if (!matchedCode) return { valid: true, warning: 'Check that the country code and number are correct.' };

  const rule = countryPhoneRules[matchedCode];
  let digits = cleaned.slice(matchedCode.length);
  if (matchedCode === '+880' && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== rule.length) {
    return {
      valid: false,
      message: `${rule.name} numbers need ${rule.length} digits after ${matchedCode} — you entered ${digits.length}`
    };
  }
  return { valid: true };
}