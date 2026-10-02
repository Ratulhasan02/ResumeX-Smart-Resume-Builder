export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export function safeUrl(value) {
  const input = String(value ?? '').trim();
  if (!input || /[\u0000-\u0020\\]/.test(input) || input.startsWith('//')) return '';

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return '';
    if (url.protocol !== 'mailto:' && !url.hostname) return '';
    return url.href;
  } catch {
    return '';
  }
}