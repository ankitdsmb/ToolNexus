import { uiStateManager } from './ui-state-manager.js';

const grid = document.getElementById('toolGrid');
if (!grid) {
  // no-op on non-grid pages
} else {
  const cards = Array.from(grid.querySelectorAll('.tool-card[data-tool-slug]'));

  if (cards.length) {
    requestAnimationFrame(() => {
      grid.classList.remove('is-loading');
      grid.classList.add('is-ready');
    });

    const applyRecentHighlight = () => {
      const recents = new Set((uiStateManager.state.recents || []).filter(Boolean));
      cards.forEach((card) => {
        const slug = card.dataset.toolSlug;
        const isRecent = Boolean(slug && recents.has(slug));
        card.classList.toggle('is-recent', isRecent);


        const usageNode = card.querySelector('[data-tool-usage]');
        if (usageNode && slug) {
          usageNode.textContent = String(uiStateManager.getUsage(slug));
        }
      });
    };

    cards.forEach((card) => {
      const track = () => uiStateManager.recordToolUsage(card.dataset.toolSlug || '');
      card.addEventListener('click', track);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          track();
        }
      });
    });

    window.addEventListener('toolnexus:statechange', applyRecentHighlight);
    applyRecentHighlight();
  }
}
