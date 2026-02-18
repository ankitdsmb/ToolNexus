import { modalManager } from './modal-manager.js';
import { uiStateManager } from './ui-state-manager.js';

const paletteId = 'commandPalette';
const palette = document.getElementById(paletteId);
const input = document.getElementById('commandPaletteInput');
const list = document.getElementById('commandPaletteList');
const themeToggle = document.getElementById('themeToggle');
const globalSearch = document.getElementById('globalToolSearch');
const paletteTrigger = document.querySelector('[data-open-palette]');

const MAX_RENDER = 22;
const RECENT_JSON_KEY = 'toolnexus.recentJson';
const PINNED_KEY = 'toolnexus.pinnedTools';

const catalog = readCatalog();
let activeIndex = -1;
let renderedItems = [];
let previouslyFocused = null;
const eventController = new AbortController();

const activeToolPageSlug = document.querySelector('.tool-page')?.dataset.slug;
if (activeToolPageSlug) uiStateManager.recordToolUsage(activeToolPageSlug);

if (palette && input && list) {
  init();
}

function init() {
  palette.hidden = true;
  palette.dataset.state = 'closed';
  palette.classList.remove('is-open', 'is-closing');
  bindUiEvents();
}

function isPaletteOpen() {
  return modalManager.getTopModalId() === paletteId;
}

function readCatalog() {
  const source = document.getElementById('toolCatalogData');
  if (!source?.textContent) return [];
  try {
    const parsed = JSON.parse(source.textContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function openPalette(seed = '') {
  previouslyFocused = document.activeElement;
  modalManager.openModal(paletteId, { suspendOthers: true });
  input.value = seed;
  renderItems(seed);
  requestAnimationFrame(() => input.focus());
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
  if (item.kind === 'theme-toggle') { themeToggle?.click(); return; }
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
  if (!renderedItems.length) return;
  activeIndex = (next + renderedItems.length) % renderedItems.length;
  const options = list.querySelectorAll('[role="option"]');
  options.forEach((option, idx) => option.classList.toggle('is-active', idx === activeIndex));
}

function renderItems(query = '') {
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

function handleGlobalShortcuts(event) {
  const key = event.key.toLowerCase();
  const withMeta = event.metaKey || event.ctrlKey;

  if (withMeta && key === 'k') { event.preventDefault(); isPaletteOpen() ? closePalette() : openPalette(); return; }
  if (withMeta && event.shiftKey && key === 'd') { event.preventDefault(); themeToggle?.click(); return; }
  if (withMeta && event.shiftKey && key === 'r') {
    event.preventDefault();
    const recent = (uiStateManager.state.recents || [])[0];
    if (recent) window.location.assign(`/tools/${recent}`);
    return;
  }
}

function handlePaletteControls(event) {
  if (!isPaletteOpen()) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(activeIndex + 1); return; }
  if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(activeIndex - 1); return; }
  if (event.key === 'Enter') {
    event.preventDefault();
    const item = renderedItems[activeIndex];
    if (!item?.disabled) runItem(item);
  }
}

function bindUiEvents() {
  window.addEventListener('keydown', handleGlobalShortcuts, { signal: eventController.signal });
  window.addEventListener('keydown', handlePaletteControls, { signal: eventController.signal });

  input?.addEventListener('input', () => renderItems(input.value), { signal: eventController.signal });
  palette?.querySelectorAll('[data-command-close]').forEach((b) => b.addEventListener('click', closePalette, { signal: eventController.signal }));

  paletteTrigger?.addEventListener('click', () => openPalette(''), { signal: eventController.signal });

  if (globalSearch) {
    globalSearch.addEventListener('focus', () => {
      openPalette(globalSearch.value || '');
      globalSearch.blur();
    }, { signal: eventController.signal });
    globalSearch.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        openPalette(globalSearch.value || '');
      }
    }, { signal: eventController.signal });
  }
}

const topbar = document.querySelector('.topbar');
window.addEventListener('scroll', () => {
  topbar?.classList.toggle('is-scrolled', window.scrollY > 12);
}, { passive: true, signal: eventController.signal });
