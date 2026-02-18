import { modalManager } from './modal-manager.js';
import { uiStateManager } from './ui-state-manager.js';

const paletteId = 'commandPalette';
const MAX_RENDER = 22;
const RECENT_JSON_KEY = 'toolnexus.recentJson';
const PINNED_KEY = 'toolnexus.pinnedTools';

let catalog = [];
let catalogPromise = null;
let activeIndex = -1;
let renderedItems = [];
let previouslyFocused = null;
let initialized = false;
let palette;
let input;
let list;

const eventController = new AbortController();

function createCommandPalette() {
  const wrapper = document.createElement('div');
  wrapper.id = paletteId;
  wrapper.dataset.modalRoot = '';
  wrapper.dataset.modalId = paletteId;
  wrapper.dataset.state = 'closed';
  wrapper.hidden = true;
  wrapper.className = 'command-palette tn-modal';

  wrapper.innerHTML = `
    <button class="tn-modal__backdrop command-palette__overlay" type="button" data-modal-backdrop aria-label="Close command palette"></button>

    <section class="tn-modal__dialog command-palette__dialog" data-modal-dialog role="dialog" aria-modal="true" aria-labelledby="commandPaletteTitle" tabindex="-1">
      <header class="command-palette__header">
        <p id="commandPaletteTitle" class="command-palette__title">Command Palette</p>
        <div class="command-palette__header-actions">
          <span class="command-palette__shortcut">⌘K to open · Esc to close</span>
          <button class="tn-modal__close" type="button" data-command-close aria-label="Close command palette">✕</button>
        </div>
      </header>

      <label class="u-sr-only" for="commandPaletteInput">Search tools and commands</label>
      <input id="commandPaletteInput" class="command-palette__input" type="text" autocomplete="off" placeholder="Search tools, actions, recents..." />

      <p class="command-palette__assistive" id="commandPaletteHint">Use arrow keys to navigate and Enter to run a command.</p>
      <ul id="commandPaletteList" class="command-palette__list" role="listbox" aria-describedby="commandPaletteHint"></ul>
    </section>
  `;

  document.body.appendChild(wrapper);
  return wrapper;
}

function ensurePaletteDom() {
  if (!palette || !palette.isConnected) {
    palette = document.getElementById(paletteId) || createCommandPalette();
    input = palette.querySelector('#commandPaletteInput');
    list = palette.querySelector('#commandPaletteList');
  }

  if (!modalManager.tryRegisterById(paletteId)) {
    modalManager.registerModal(palette);
  }

  return { palette, input, list };
}

async function ensureCatalogLoaded() {
  if (catalog.length) return catalog;
  if (!catalogPromise) {
    catalogPromise = fetch('/tools/catalog', { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => {
        catalog = Array.isArray(items) ? items : [];
        return catalog;
      })
      .catch(() => [])
      .finally(() => {
        catalogPromise = null;
      });
  }

  return catalogPromise;
}

function isPaletteOpen() {
  return modalManager.getTopModalId() === paletteId;
}

function readStorageArray(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function closePalette() {
  if (!isPaletteOpen()) return;

  modalManager.closeModal(paletteId);
  if (previouslyFocused?.focus) previouslyFocused.focus();
}

function normalizedQuery(value) { return (value || '').trim().toLowerCase(); }

function fuzzyScore(needle, haystack) {
  if (!needle) return 0;
  const query = needle.toLowerCase();
  const text = (haystack || '').toLowerCase();
  if (!text) return -1;
  if (text.startsWith(query)) return 120;
  if (text.includes(query)) return 80 - text.indexOf(query);
  let score = 0; let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i += 1) {
    if (text[i] === query[qi]) { score += 4; qi += 1; }
  }
  return qi === query.length ? score : -1;
}

function getIcon(tool) {
  const category = (tool.category || '').toLowerCase();
  if (category.includes('json')) return '⧉';
  if (category.includes('xml')) return '◇';
  if (category.includes('text')) return '✎';
  if (category.includes('encode') || category.includes('convert')) return '⇄';
  return '⌁';
}

function getFilteredTools(query) {
  const lookup = normalizedQuery(query);
  const pinned = new Set(readStorageArray(PINNED_KEY));
  return uiStateManager.getSortedByUsage(catalog)
    .map((tool) => {
      const combined = [tool.title, tool.slug, tool.category, tool.description].join(' ');
      const fuzzy = lookup ? fuzzyScore(lookup, combined) : 0;
      if (lookup && fuzzy < 0) return null;
      const pinBoost = pinned.has(tool.slug) ? 30 : 0;
      const usageBoost = Math.min(uiStateManager.getUsage(tool.slug) * 2, 25);
      return {
        kind: 'tool',
        slug: tool.slug,
        title: tool.title,
        description: tool.description,
        category: tool.category,
        icon: getIcon(tool),
        score: fuzzy + pinBoost + usageBoost,
        meta: uiStateManager.getUsage(tool.slug) > 0 ? `Used ${uiStateManager.getUsage(tool.slug)}x` : 'Tool',
        shortcut: '↵'
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RENDER);
}

function getQuickActions(query) {
  const lookup = normalizedQuery(query);
  const quickItems = [
    { kind: 'theme-toggle', title: 'Toggle theme', description: 'Switch between dark and light mode.', category: 'Display', shortcut: '⌘⇧D' },
    { kind: 'copy-recent-json', title: 'Copy recent JSON', description: 'Copy most recent JSON output.', category: 'Quick Actions', shortcut: '⌘C', disabled: !localStorage.getItem(RECENT_JSON_KEY) },
    { kind: 'open-recent-tool', title: 'Open most recent tool', description: 'Jump back to your last tool.', category: 'Recents', shortcut: '⌘⇧R', disabled: !(uiStateManager.state.recents || [])[0] }
  ];
  return quickItems.filter((item) => !lookup || `${item.title} ${item.description}`.toLowerCase().includes(lookup));
}

function runItem(item) {
  if (!item) return;
  if (item.kind === 'tool') {
    uiStateManager.recordToolUsage(item.slug);
    window.location.assign(`/tools/${item.slug}`);
    return;
  }
  if (item.kind === 'theme-toggle') {
    document.getElementById('themeToggle')?.click();
    closePalette();
    return;
  }
  if (item.kind === 'copy-recent-json') {
    const v = localStorage.getItem(RECENT_JSON_KEY);
    if (v) navigator.clipboard.writeText(v).catch(() => {});
    closePalette();
    return;
  }
  if (item.kind === 'open-recent-tool') {
    const latest = (uiStateManager.state.recents || [])[0];
    if (latest) window.location.assign(`/tools/${latest}`);
  }
}

function setActiveIndex(next) {
  if (!list || !renderedItems.length) return;
  activeIndex = (next + renderedItems.length) % renderedItems.length;
  const options = list.querySelectorAll('[role="option"]');
  options.forEach((option, idx) => option.classList.toggle('is-active', idx === activeIndex));
  const activeOption = options[activeIndex];
  activeOption?.scrollIntoView({ block: 'nearest' });
}

function renderItems(query = '') {
  if (!list) return;

  renderedItems = [...getQuickActions(query), ...getFilteredTools(query)].slice(0, MAX_RENDER);
  list.innerHTML = '';
  if (!renderedItems.length) {
    list.innerHTML = '<li class="command-palette__empty">No commands found.</li>';
    return;
  }

  renderedItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'command-palette__item';
    if (item.disabled) li.classList.add('is-disabled');
    li.setAttribute('role', 'option');

    li.innerHTML = `<div class="command-palette__action"><span class="command-palette__text"><span class="command-palette__item-title">${item.icon ? `${item.icon} ` : ''}${item.title}</span><span class="command-palette__item-desc">${item.description || item.category}</span></span><span class="command-palette__meta-wrap"><span class="command-palette__meta">${item.meta || item.category || 'Command'}</span>${item.shortcut ? `<kbd class="command-palette__kbd">${item.shortcut}</kbd>` : ''}</span></div>`;
    li.addEventListener('mouseenter', () => setActiveIndex(index), { signal: eventController.signal });
    li.addEventListener('click', () => { if (!item.disabled) runItem(item); }, { signal: eventController.signal });
    list.appendChild(li);
  });

  setActiveIndex(0);
}

function handlePaletteControls(event) {
  if (!isPaletteOpen()) return;
  if (event.key === 'Escape') { event.preventDefault(); closePalette(); return; }
  if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(activeIndex + 1); return; }
  if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(activeIndex - 1); return; }
  if (event.key === 'Enter') {
    event.preventDefault();
    const item = renderedItems[activeIndex];
    if (!item?.disabled) runItem(item);
  }
}

function bindPaletteEvents() {
  window.addEventListener('keydown', handlePaletteControls, { signal: eventController.signal });

  input?.addEventListener('input', async () => {
    await ensureCatalogLoaded();
    renderItems(input.value);
  }, { signal: eventController.signal });

  palette?.querySelectorAll('[data-command-close]').forEach((button) => {
    button.addEventListener('click', closePalette, { signal: eventController.signal });
  });

  const topbar = document.querySelector('.topbar');
  window.addEventListener('scroll', () => {
    topbar?.classList.toggle('is-scrolled', window.scrollY > 12);
  }, { passive: true, signal: eventController.signal });
}

function initPaletteIfNeeded() {
  if (initialized) return;

  const activeToolPageSlug = document.querySelector('.tool-page')?.dataset.slug;
  if (activeToolPageSlug) uiStateManager.recordToolUsage(activeToolPageSlug);

  ensurePaletteDom();
  bindPaletteEvents();
  initialized = true;
}

export async function openCommandPalette(seed = '') {
  initPaletteIfNeeded();

  previouslyFocused = document.activeElement;
  modalManager.openModal(paletteId, { suspendOthers: true });

  input.value = seed;
  list.innerHTML = '<li class="command-palette__empty">Loading commands...</li>';
  await ensureCatalogLoaded();
  renderItems(seed);
  requestAnimationFrame(() => input.focus());
}

export function closeCommandPalette() {
  closePalette();
}

export function toggleCommandPalette(seed = '') {
  if (isPaletteOpen()) {
    closePalette();
    return;
  }

  openCommandPalette(seed);
}
