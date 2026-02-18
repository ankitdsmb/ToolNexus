import { uiStateManager } from './ui-state-manager.js';

const groups = Array.from(document.querySelectorAll('[data-tool-group]'));
if (groups.length === 0) {
  // no-op on non-tools pages
} else {
  const searchInput = document.getElementById('toolsSearchInput');
  const filterButtons = Array.from(document.querySelectorAll('[data-category-filter]'));
  const densityButtons = Array.from(document.querySelectorAll('[data-density]'));

  const cards = Array.from(document.querySelectorAll('.tool-card[data-tool-slug]')).map((card) => ({
    card,
    slug: card.dataset.toolSlug || '',
    category: card.dataset.category || '',
    searchable: (card.dataset.searchable || '').toLowerCase(),
    group: card.closest('[data-tool-group]')
  }));

  groups.forEach((group) => {
    const grid = group.querySelector('.tool-grid');
    grid?.classList.remove('is-loading');
    grid?.classList.add('is-ready');
  });

  const usageNodes = new Map();
  cards.forEach(({ card, slug }) => {
    const usageNode = card.querySelector('[data-tool-usage]');
    if (usageNode && slug) {
      usageNodes.set(slug, usageNode);
    }

    const track = () => uiStateManager.recordToolUsage(slug);
    card.addEventListener('click', track);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        track();
      }
    });
  });

  let activeCategory = 'all';

  function updateRecentsAndUsage() {
    const recents = new Set((uiStateManager.state.recents || []).filter(Boolean));
    cards.forEach(({ card, slug }) => {
      card.classList.toggle('is-recent', recents.has(slug));
      const usageNode = usageNodes.get(slug);
      if (usageNode) {
        usageNode.textContent = String(uiStateManager.getUsage(slug));
      }
    });
  }

  function applyFilters() {
    const query = (searchInput?.value || '').trim().toLowerCase();

    groups.forEach((group) => {
      const category = (group.dataset.category || '').toLowerCase();
      const cardItems = Array.from(group.querySelectorAll('.tool-card[data-tool-slug]'));
      let visible = 0;

      cardItems.forEach((card) => {
        const slug = card.dataset.toolSlug || '';
        const searchable = (card.dataset.searchable || '').toLowerCase();
        const categoryMatch = activeCategory === 'all' || category === activeCategory;
        const queryMatch = !query || searchable.includes(query) || slug.includes(query);
        const show = categoryMatch && queryMatch;

        card.hidden = !show;
        card.setAttribute('aria-hidden', show ? 'false' : 'true');
        if (show) visible += 1;
      });

      group.hidden = visible === 0;
      const count = group.querySelector('[data-group-count]');
      if (count) {
        count.textContent = `${visible} tool${visible === 1 ? '' : 's'}`;
      }
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = (button.dataset.categoryFilter || 'all').toLowerCase();
      filterButtons.forEach((node) => node.classList.toggle('is-active', node === button));
      applyFilters();
    });
  });

  densityButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const compact = button.dataset.density === 'compact';
      document.querySelectorAll('.tool-grid').forEach((grid) => {
        grid.classList.toggle('compact', compact);
      });
      densityButtons.forEach((node) => node.classList.toggle('is-active', node === button));
    });
  });

  searchInput?.addEventListener('input', applyFilters);
  window.addEventListener('toolnexus:statechange', updateRecentsAndUsage);

  updateRecentsAndUsage();
  applyFilters();
}
