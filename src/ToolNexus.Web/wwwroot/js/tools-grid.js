(function () {
  const grid = document.getElementById('toolGrid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.tool-card'));
  if (!cards.length) return;

  requestAnimationFrame(() => {
    grid.classList.add('is-ready');
  });

  const storageKey = 'toolnexus.recentTools';
  const maxRecent = 8;

  function readRecent() {
    try {
      const value = localStorage.getItem(storageKey);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch (_error) {
      return [];
    }
  }

  function writeRecent(slug) {
    if (!slug) return;

    const next = [slug, ...readRecent().filter((item) => item !== slug)].slice(0, maxRecent);

    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (_error) {
      // no-op: localStorage might be disabled by the browser.
    }
  }

  function applyRecentHighlight() {
    const recent = new Set(readRecent());

    cards.forEach((card) => {
      const slug = card.dataset.toolSlug;
      const isRecent = Boolean(slug && recent.has(slug));
      card.classList.toggle('is-recent', isRecent);

      const badge = card.querySelector('[data-recent-badge]');
      if (badge) {
        badge.hidden = !isRecent;
      }
    });
  }

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      writeRecent(card.dataset.toolSlug || '');
    });

    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        writeRecent(card.dataset.toolSlug || '');
      }
    });
  });

  applyRecentHighlight();
})();
