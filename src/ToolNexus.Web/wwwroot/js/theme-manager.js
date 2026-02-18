const themeStorageKey = 'toolnexus-theme';
const root = document.documentElement;

function getPreferredTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getActiveTheme() {
  const attributeTheme = root.getAttribute('data-theme');
  return attributeTheme === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('toolnexus:themechange', { detail: { theme } }));
}

function syncToggle(toggle, theme) {
  const isDark = theme === 'dark';
  toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  toggle.setAttribute('aria-label', isDark ? 'Activate light theme' : 'Activate dark theme');
}

export function initializeThemeManager() {
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
    if (localStorage.getItem(themeStorageKey)) {
      return;
    }

    const nextTheme = event.matches ? 'dark' : 'light';
    applyTheme(nextTheme);
    if (toggle) {
      syncToggle(toggle, nextTheme);
    }
  });
}

export function initializePageTransitionManager() {
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (anchor.hasAttribute('download')) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (anchor.origin !== window.location.origin) return;

    document.body.classList.add('page-transitioning');
  });

  window.addEventListener('pageshow', () => {
    document.body.classList.remove('page-transitioning');
  });
}

initializeThemeManager();
initializePageTransitionManager();
