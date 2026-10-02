/**
 * Theme Module
 * Manages Dark/Light mode toggle, persists preference, and syncs with state.
 */

const THEME_KEY = 'resume_builder_theme';

export function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }
}

export function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem(THEME_KEY, 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_KEY, 'light');
  }
  updateThemeToggleIcon(theme);
}

function updateThemeToggleIcon(theme) {
  const sunIcon = document.getElementById('theme-sun-icon');
  const moonIcon = document.getElementById('theme-moon-icon');

  if (sunIcon && moonIcon) {
    if (theme === 'dark') {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  }
}
