import { uiStateManager } from './ui-state-manager.js';

function updateHeaderBadge() {
  const badge = document.querySelector('[data-performance-badge]');
  if (!badge) return;
  const perf = uiStateManager.getPerformanceBadge();
  badge.textContent = `${perf.label} · ${perf.value}ms`;
  badge.dataset.tone = perf.tone;
}

function updateTrustStats() {
  const nodes = document.querySelectorAll('[data-dynamic-stat]');
  if (!nodes.length) return;

  const today = Object.values(uiStateManager.state.toolUsage).reduce((acc, n) => acc + n, 0);
  const stats = {
    toolsToday: today,
    sessions: uiStateManager.state.totalSessions,
    loadTime: uiStateManager.state.loadTimeMs,
    perf: Number((100 - Math.min(uiStateManager.state.loadTimeMs / 12, 9)).toFixed(2))
  };

  nodes.forEach((node) => {
    const key = node.dataset.dynamicStat;
    if (key in stats) {
      const value = Number(stats[key]);
      node.dataset.target = String(value);
      node.textContent = value.toLocaleString(undefined, { maximumFractionDigits: key === 'perf' ? 2 : 0 });
    }
  });
}

function applyRecentTools() {
  const cards = document.querySelectorAll('.tool-card[data-tool-slug], .card[data-tool-slug]');
  if (!cards.length) return;
  const recentSet = new Set(uiStateManager.state.recents || []);

  cards.forEach((card) => {
    const slug = card.dataset.toolSlug;
    const isRecent = recentSet.has(slug);
    card.classList.toggle('is-recent', isRecent);
  });
}

function bindUsageTracking() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-tool-slug]');
    if (!link) return;
    uiStateManager.recordToolUsage(link.dataset.toolSlug);
  });
}

function bindThemeSync() {
  window.addEventListener('toolnexus:themechange', (event) => {
    const theme = event.detail?.theme || document.documentElement.getAttribute('data-theme') || 'dark';
    uiStateManager.syncTheme(theme);
  });
}

window.addEventListener('toolnexus:statechange', () => {
  updateHeaderBadge();
  updateTrustStats();
  applyRecentTools();
});

bindUsageTracking();
bindThemeSync();
updateHeaderBadge();
updateTrustStats();
applyRecentTools();
