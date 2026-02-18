import { uiStateManager } from './ui-state-manager.js';

function initToolsGrid() {
  const searchInput = document.querySelector('#toolsSearchInput');
  const categoryButtons = Array.from(document.querySelectorAll('[data-category-filter]'));
  const densityButtons = Array.from(document.querySelectorAll('[data-density]'));
  const groups = Array.from(document.querySelectorAll('[data-tool-group]'));

  if (groups.length === 0) {
    return;
  }

  if (!searchInput) {
    console.warn('[tools-grid] Search input not found (#toolsSearchInput).');
  }

  if (categoryButtons.length === 0) {
    console.warn('[tools-grid] Category filter buttons not found ([data-category-filter]).');
  }

  const cards = Array.from(document.querySelectorAll('.tool-card[data-tool-slug]')).map((card) => {
    const titleNode = card.querySelector('.tool-card__title');
    const tagNodes = Array.from(card.querySelectorAll('.tool-card__tag'));

    if (!card.dataset.title) {
      card.dataset.title = (titleNode?.textContent || '').trim();
    }

    if (!card.dataset.category) {
      card.dataset.category = card.closest('[data-tool-group]')?.dataset.category || '';
    }

    if (!card.dataset.tags) {
      card.dataset.tags = tagNodes.map((node) => (node.textContent || '').trim()).filter(Boolean).join(' ');
    }

    return {
      card,
      slug: card.dataset.toolSlug || '',
      title: (card.dataset.title || '').toLowerCase(),
      category: (card.dataset.category || '').toLowerCase(),
      tags: (card.dataset.tags || '').toLowerCase(),
      searchable: (card.dataset.searchable || '').toLowerCase()
    };
  });

  if (cards.length === 0) {
    console.warn('[tools-grid] Tool cards not found (.tool-card[data-tool-slug]).');
    return;
  }

  groups.forEach((group) => {
    const grid = group.querySelector('.tool-grid');
    grid?.classList.remove('is-loading');
    grid?.classList.add('is-ready');
  });

  const container = document.querySelector('.tools-index');
  let noResultsNode = container?.querySelector('[data-tools-empty-state]');
  if (!noResultsNode && container) {
    noResultsNode = document.createElement('p');
    noResultsNode.dataset.toolsEmptyState = 'true';
    noResultsNode.className = 'u-muted';
    noResultsNode.textContent = 'No results found.';
    noResultsNode.hidden = true;
    container.appendChild(noResultsNode);
  }

  let activeCategory = 'all';

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
    let totalVisible = 0;

    groups.forEach((group) => {
      const groupCategory = (group.dataset.category || '').toLowerCase();
      let visibleInGroup = 0;

      cards.forEach((entry) => {
        if (!group.contains(entry.card)) {
          return;
        }

        const categoryMatch = activeCategory === 'all' || entry.category === activeCategory || groupCategory === activeCategory;
        const queryMatch = !query
          || entry.title.includes(query)
          || entry.tags.includes(query)
          || entry.category.includes(query)
          || entry.slug.includes(query)
          || entry.searchable.includes(query);
        const show = categoryMatch && queryMatch;

        entry.card.hidden = !show;
        entry.card.setAttribute('aria-hidden', show ? 'false' : 'true');

        if (show) {
          visibleInGroup += 1;
          totalVisible += 1;
        }
      });

      group.hidden = visibleInGroup === 0;
      const count = group.querySelector('[data-group-count]');
      if (count) {
        count.textContent = `${visibleInGroup} tool${visibleInGroup === 1 ? '' : 's'}`;
      }
    });

    if (noResultsNode) {
      noResultsNode.hidden = totalVisible !== 0;
    }
  }

  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = (button.dataset.categoryFilter || 'all').toLowerCase();
      categoryButtons.forEach((node) => node.classList.toggle('is-active', node === button));
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToolsGrid, { once: true });
} else {
  initToolsGrid();
}
