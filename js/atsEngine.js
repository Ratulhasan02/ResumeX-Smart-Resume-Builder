import skillTaxonomy from '../data/skills.json' with { type: 'json' };

const STOP_WORDS = new Set(skillTaxonomy.stopWords);
const TAXONOMY = Object.entries(skillTaxonomy.domains).flatMap(([domain, skills]) =>
  skills.map(skill => ({ ...skill, domain })));
const TAXONOMY_TOKENS = new Set(TAXONOMY.flatMap(skill =>
  [skill.key, ...skill.aliases].flatMap(value => stemmedTokens(value))));

function normalizeTokens(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/c\+\+/g, ' cplusplus ')
    .replace(/c#/g, ' csharp ')
    .replace(/\.net/g, ' dotnet ')
    .replace(/ci\s*\/\s*cd/g, ' cicd ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function stemToken(token) {
  if (token.length > 5 && token.endsWith('ied')) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith('ing')) {
    let stem = token.slice(0, -3);
    if (/(.)\1$/.test(stem)) stem = stem.slice(0, -1);
    return stem;
  }
  if (token.length > 4 && token.endsWith('ed')) {
    let stem = token.slice(0, -2);
    if (/(.)\1$/.test(stem)) stem = stem.slice(0, -1);
    return stem;
  }
  if (token.length > 4 && /(?:ches|shes|xes|zes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  if (token.length > 4 && token.endsWith('e')) return token.slice(0, -1);
  return token;
}

function stemmedTokens(value) {
  return normalizeTokens(value).map(stemToken);
}

function phraseKey(tokens) {
  return tokens.map(stemToken).join(' ');
}

function titleCase(value) {
  return value.replace(/\b[a-z]/g, character => character.toUpperCase());
}

const ALIAS_LOOKUP = new Map();
TAXONOMY.forEach(skill => {
  [skill.key, ...skill.aliases].forEach(alias => {
    const key = phraseKey(normalizeTokens(alias));
    if (key && !ALIAS_LOOKUP.has(key)) ALIAS_LOOKUP.set(key, skill);
  });
});

function isRequirementHeading(line) {
  const heading = line.trim().replace(/^[-*•\s]+/, '').replace(/:$/, '').toLowerCase();
  if (/^(preferred|nice to have|nice-to-have|desired|bonus|what we offer|benefits|responsibilities|about the role|what you will do)\b/.test(heading)) return false;
  return /^(requirements?|qualifications?|must[- ]haves?|minimum qualifications?|what you bring|what you will need|what you'll need)\b/.test(heading);
}

function extractSections(text) {
  let required = false;
  return String(text ?? '').split(/\r?\n/).map(line => {
    if (isRequirementHeading(line)) {
      required = true;
      return { text: line.replace(/^.*?:\s*/, ''), required };
    }
    if (/^\s*(?:preferred|nice to have|nice-to-have|desired|bonus|responsibilities|about the role|what you will do)\b/i.test(line)) {
      required = false;
    }
    return { text: line, required };
  });
}

function countPhrase(tokens, phraseTokens) {
  if (!phraseTokens.length || phraseTokens.length > tokens.length) return 0;
  let count = 0;
  for (let start = 0; start <= tokens.length - phraseTokens.length; start += 1) {
    if (phraseTokens.every((token, offset) => token === tokens[start + offset])) count += 1;
  }
  return count;
}

export function extractJobKeywords(jobDescription, limit = 40) {
  const candidates = new Map();
  const sections = extractSections(jobDescription);

  const addCandidate = (key, label, category, frequency, requiredFrequency) => {
    if (!frequency) return;
    const current = candidates.get(key) || {
      key,
      label,
      category,
      frequency: 0,
      requiredFrequency: 0,
      required: false,
      weight: 1,
      rankScore: 0
    };
    current.frequency += frequency;
    current.requiredFrequency += requiredFrequency;
    current.required = current.requiredFrequency > 0;
    current.weight = current.required ? 2 : 1;
    current.rankScore = current.frequency + current.requiredFrequency * 3;
    candidates.set(key, current);
  };

  TAXONOMY.forEach(skill => {
    let frequency = 0;
    let requiredFrequency = 0;
    const patterns = new Set([skill.key, ...skill.aliases].map(alias => phraseKey(normalizeTokens(alias))));
    patterns.forEach(pattern => {
      const phraseTokens = pattern.split(' ');
      sections.forEach(section => {
        const count = countPhrase(stemmedTokens(section.text), phraseTokens);
        frequency += count;
        if (section.required) requiredFrequency += count;
      });
    });
    addCandidate(skill.key, skill.label, skill.domain, frequency, requiredFrequency);
  });

  sections.forEach(section => {
    const tokens = stemmedTokens(section.text);
    for (let size = 1; size <= 3; size += 1) {
      for (let start = 0; start <= tokens.length - size; start += 1) {
        const phraseTokens = tokens.slice(start, start + size);
        const rawPhraseTokens = normalizeTokens(section.text).slice(start, start + size);
        if (phraseTokens.some(token => STOP_WORDS.has(token) || TAXONOMY_TOKENS.has(token)) || (size === 1 && phraseTokens[0].length < 3)) continue;
        const stemmedKey = phraseTokens.join(' ');
        if (ALIAS_LOOKUP.has(stemmedKey)) continue;

        const requiredFrequency = section.required ? 1 : 0;
        const key = rawPhraseTokens.join(' ').toLowerCase();
        addCandidate(key, titleCase(key), 'general', 1, requiredFrequency);
      }
    }
  });

  return [...candidates.values()]
    .sort((left, right) => right.rankScore - left.rankScore || right.frequency - left.frequency || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function getResumeText(resume) {
  return [
    resume.personal?.name,
    resume.personal?.title,
    resume.personal?.summary,
    resume.personal?.location,
    resume.personal?.email,
    resume.personal?.phone,
    ...(resume.skills || []),
    ...(resume.experience || []).flatMap(item => [item.role, item.company, item.duration, item.description]),
    ...(resume.education || []).flatMap(item => [item.school, item.degree, item.year, item.grade]),
    ...(resume.projects || []).flatMap(item => [item.title, item.description, item.link]),
    ...(resume.achievements || []).flatMap(item => [item.title, item.description]),
    ...Object.values(resume.links || {})
  ].filter(Boolean).join(' ');
}

export function matchJobDescription(jobDescription, resume, limit = 40) {
  const targets = extractJobKeywords(jobDescription, limit);
  const resumeTokens = stemmedTokens(getResumeText(resume));
  const matchedKeywords = [];
  const missingKeywords = [];
  const categories = new Map();
  let matchedWeight = 0;
  let totalWeight = 0;

  targets.forEach(target => {
    const skill = TAXONOMY.find(entry => entry.key === target.key);
    const variants = [target.key, ...(skill?.aliases || [])].map(stemmedTokens);
    const matched = variants.some(phraseTokens => countPhrase(resumeTokens, phraseTokens) > 0);
    const result = { ...target, matched };
    const category = categories.get(target.category) || { category: target.category, total: 0, matched: 0, totalWeight: 0, matchedWeight: 0 };
    category.total += 1;
    category.totalWeight += target.weight;
    totalWeight += target.weight;
    if (matched) {
      matchedKeywords.push(result);
      category.matched += 1;
      category.matchedWeight += target.weight;
      matchedWeight += target.weight;
    } else {
      missingKeywords.push(result);
    }
    categories.set(target.category, category);
  });

  const categoryBreakdown = [...categories.values()].map(category => ({
    ...category,
    score: category.totalWeight ? Math.round(category.matchedWeight / category.totalWeight * 100) : 0
  }));

  return {
    matchPercent: totalWeight ? Math.round(matchedWeight / totalWeight * 100) : 0,
    matchedKeywords,
    missingKeywords,
    categoryBreakdown,
    targets
  };
}

function getBulletLines(description) {
  return String(description || '').split(/\r?\n/).map(line => {
    const match = line.match(/^\s*(?:[•*-]|\d+[.)])\s+(.+)$/);
    return match ? match[1].trim() : '';
  }).filter(Boolean);
}

export function analyzeBulletQuality(resume) {
  const findings = [];
  const openers = new Map();
  const roles = (resume.experience || []).filter(entry => entry.company?.trim() || entry.role?.trim());

  roles.forEach((role, roleIndex) => {
    const bullets = getBulletLines(role.description);
    if (!bullets.length) {
      findings.push({
        category: 'bullet quality',
        title: `Add bullets for ${role.role?.trim() || role.company?.trim() || `role ${roleIndex + 1}`}`,
        desc: 'Use clearly marked bullet lines so accomplishments are easy to scan.',
        fixTarget: 'experience-container'
      });
      return;
    }

    bullets.forEach((bullet, bulletIndex) => {
      const weakStart = /^(?:was\s+)?(?:responsible\s+for|worked\s+on|helped\s+with|assisted\s+with|duties\s+included)\b/i.test(bullet);
      if (weakStart) {
        findings.push({
          category: 'bullet quality',
          title: 'Strengthen a weak bullet opening',
          desc: `Replace "${bullet.split(/\s+/).slice(0, 3).join(' ')}" with a specific action verb.`,
          fixTarget: 'experience-container'
        });
      }

      if (!/\d/.test(bullet)) {
        findings.push({
          category: 'bullet quality',
          title: 'Add a measurable result',
          desc: `Bullet ${bulletIndex + 1} has no number or metric. Add a scale, time, percentage, or outcome where possible.`,
          fixTarget: 'experience-container'
        });
      }

      const wordCount = bullet.split(/\s+/).filter(Boolean).length;
      if (wordCount > 25) {
        findings.push({
          category: 'bullet quality',
          title: 'Shorten a long bullet',
          desc: `Bullet ${bulletIndex + 1} has ${wordCount} words; aim for about 25 or fewer.`,
          fixTarget: 'experience-container'
        });
      }

      const openingVerb = stemToken((bullet.match(/^[\p{L}]+/u) || [''])[0].toLowerCase());
      if (openingVerb) {
        const occurrences = openers.get(openingVerb) || [];
        occurrences.push(roleIndex);
        openers.set(openingVerb, occurrences);
      }
    });
  });

  openers.forEach((rolesWithVerb, verb) => {
    if (rolesWithVerb.length > 1) {
      findings.push({
        category: 'bullet quality',
        title: 'Vary repeated opening verbs',
        desc: `The verb "${verb}" starts ${rolesWithVerb.length} bullets. Choose varied action verbs.`,
        fixTarget: 'experience-container'
      });
    }
  });

  return findings;
}

function getResumeContent(resume) {
  return [
    ...Object.values(resume.personal || {}),
    ...(resume.skills || []),
    ...(resume.experience || []).flatMap(item => Object.values(item)),
    ...(resume.education || []).flatMap(item => Object.values(item)),
    ...(resume.projects || []).flatMap(item => Object.values(item)),
    ...(resume.achievements || []).flatMap(item => Object.values(item)),
    ...Object.values(resume.links || {})
  ].filter(value => typeof value === 'string' && value.trim());
}

function dateFormat(value) {
  if (/\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)\b/i.test(value)) return 'year range';
  if (/\b\d{1,2}[/-]\d{4}\b/.test(value)) return 'numeric month and year';
  if (/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{4}\b/i.test(value)) return 'month name and year';
  return '';
}

export function analyzeFormatQuality(resume) {
  const findings = [];
  const content = getResumeContent(resume);
  const allText = content.join(' ');

  if (/\p{Extended_Pictographic}/u.test(allText)) {
    findings.push({
      category: 'format',
      title: 'Remove emoji characters',
      desc: 'Emojis may be misread by some resume parsers; use plain text or standard punctuation.',
      fixTarget: 'personal-summary'
    });
  }

  const summaryLength = (resume.personal?.summary || '').trim().length;
  if (summaryLength > 450) {
    findings.push({
      category: 'format',
      title: 'Shorten the professional summary',
      desc: `The summary is ${summaryLength} characters; keep it concise and within the 450-character editor limit.`,
      fixTarget: 'personal-summary'
    });
  }

  const dates = [
    ...(resume.experience || []).map(item => item.duration || ''),
    ...(resume.education || []).map(item => item.year || '')
  ].map(value => dateFormat(value)).filter(Boolean);
  if (new Set(dates).size > 1) {
    findings.push({
      category: 'format',
      title: 'Use a consistent date format',
      desc: 'Employment and education dates use different formats. Standardize them across the resume.',
      fixTarget: 'experience-container'
    });
  }

  if (!Object.values(resume.links || {}).some(value => String(value || '').trim())) {
    findings.push({
      category: 'format',
      title: 'Add a professional link',
      desc: 'Add a relevant LinkedIn, portfolio, GitHub, or other professional profile link.',
      fixTarget: 'link-linkedin'
    });
  }

  return findings;
}

export function getResumeQualityFindings(resume) {
  return [...analyzeBulletQuality(resume), ...analyzeFormatQuality(resume)];
}