(function () {
  const grid = document.getElementById('toolGrid');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.tool-card[data-tool-slug]'));
  if (!cards.length) return;

  const state = window.ToolNexusUiState;

  requestAnimationFrame(() => {
    grid.classList.remove('is-loading');
    grid.classList.add('is-ready');
  });

  function applyRecentHighlight() {
    const recents = new Set((state?.state?.recents || []).filter(Boolean));
    cards.forEach((card) => {
      const slug = card.dataset.toolSlug;
      const isRecent = Boolean(slug && recents.has(slug));
      card.classList.toggle('is-recent', isRecent);
      const badge = card.querySelector('[data-recent-badge]');
      if (badge) badge.hidden = !isRecent;

      const usageNode = card.querySelector('[data-tool-usage]');
      if (usageNode && state) {
        usageNode.textContent = String(state.getUsage(slug));
      }
    });
  }

  cards.forEach((card) => {
    const track = () => state?.recordToolUsage(card.dataset.toolSlug || '');
    card.addEventListener('click', track);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') track();
    });
  });

  window.addEventListener('toolnexus:statechange', applyRecentHighlight);
  applyRecentHighlight();
})();
