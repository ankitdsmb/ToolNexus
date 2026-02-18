const themeStorageKey = 'toolnexus-theme';
const root = document.documentElement;

function getPreferredTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getActiveTheme() {
  return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('toolnexus:themechange', { detail: { theme } }));
}

function syncToggle(toggle, theme) {
  const isDark = theme === 'dark';
  toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  toggle.setAttribute('aria-label', isDark ? 'Activate light theme' : 'Activate dark theme');
  toggle.dataset.theme = theme;
}

function initializeThemeManager() {
  const storedTheme = localStorage.getItem(themeStorageKey);
  const initialTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : getPreferredTheme();
  applyTheme(initialTheme);

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    syncToggle(toggle, getActiveTheme());
    toggle.addEventListener('click', () => {
      const nextTheme = getActiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem(themeStorageKey, nextTheme);
      syncToggle(toggle, nextTheme);
    });
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', (event) => {
    if (localStorage.getItem(themeStorageKey)) return;
    const nextTheme = event.matches ? 'dark' : 'light';
    applyTheme(nextTheme);
    if (toggle) syncToggle(toggle, nextTheme);
  });
}

initializeThemeManager();
