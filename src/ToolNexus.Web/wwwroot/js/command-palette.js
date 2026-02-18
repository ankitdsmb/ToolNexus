import { uiStateManager } from './ui-state-manager.js';

const SELECTORS = {
  modal: '#commandPaletteModal',
  input: '#commandPaletteInput',
  list: '#commandPaletteList',
  close: '[data-command-close]',
  action: '.command-palette__action'
};

const MAX_ITEMS = 18;

const state = {
  initialized: false,
  open: false,
  tools: [],
  commands: [],
  filtered: [],
  activeIndex: 0,
  elements: null,
  lastFocused: null
};

function createCommandPalette() {
  const wrapper = document.createElement('div');
  wrapper.id = 'commandPaletteModal';
  wrapper.className = 'command-palette';
  wrapper.hidden = true;
  wrapper.innerHTML = `
    <button class="command-palette__backdrop" type="button" data-command-close aria-label="Close command palette"></button>
    <section class="command-palette__dialog" role="dialog" aria-modal="true" aria-labelledby="commandPaletteTitle">
      <header class="command-palette__header">
        <div class="command-palette__title-wrap">
          <h2 id="commandPaletteTitle" class="command-palette__title">Command palette</h2>
          <p class="command-palette__hint">⌘K to open · Esc to close</p>
        </div>
        <button class="command-palette__close" type="button" data-command-close aria-label="Close command palette">✕</button>
      </header>
      <label class="u-sr-only" for="commandPaletteInput">Search tools</label>
      <input id="commandPaletteInput" class="command-palette__input" type="text" placeholder="Search tools and actions..." autocomplete="off" />
      <div class="command-palette__list-wrap">
        <ul id="commandPaletteList" class="command-palette__list" role="listbox"></ul>
      </div>
    </section>`;

  document.body.append(wrapper);
  return wrapper;
}

function queryElements() {
  if (state.elements) return state.elements;

  const modal = document.querySelector(SELECTORS.modal) || createCommandPalette();
  state.elements = {
    modal,
    input: modal.querySelector(SELECTORS.input),
    list: modal.querySelector(SELECTORS.list)
  };

  return state.elements;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatUsage(count) {
  return `Used ${count}x`;
}

function createCommandFromTool(tool) {
  const usage = uiStateManager.getUsage(tool.slug);
  const isRecent = (uiStateManager.state.recents || []).includes(tool.slug);

  return {
    id: `tool:${tool.slug}`,
    slug: tool.slug,
    title: tool.title,
    description: tool.description,
    icon: '🧰',
    category: isRecent ? 'Recents' : 'Tool',
    shortcut: '↩ Open',
    usage,
    href: tool.href,
    searchText: `${tool.title} ${tool.slug} ${tool.description} ${isRecent ? 'recent' : 'tool'}`.toLowerCase(),
    onSelect: () => {
      uiStateManager.recordToolUsage(tool.slug);
      window.location.assign(tool.href);
    }
  };
}

function createDisplayCommand() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const title = isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme';

  return {
    id: 'display:theme-toggle',
    slug: 'theme-toggle',
    title,
    description: 'Toggle ToolNexus display theme preferences.',
    icon: '🖥️',
    category: 'Actions',
    shortcut: '⌘D',
    usage: 0,
    href: '',
    searchText: `${title} theme display dark light`.toLowerCase(),
    onSelect: () => {
      const nextTheme = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('toolnexus-theme', nextTheme);
      uiStateManager.syncTheme(nextTheme);
      closeCommandPalette();
    }
  };
}

function buildCommandCollection() {
  const toolCommands = state.tools.map(createCommandFromTool);
  state.commands = [createDisplayCommand(), ...toolCommands];
}


function sectionOrderLabel(category) {
  const normalized = category.toLowerCase();
  if (normalized === 'recents') return 'Recent';
  if (normalized === 'tool') return 'Tools';
  return 'Actions';
}

function groupCommands(commands) {
  const grouped = new Map([
    ['Recent', []],
    ['Tools', []],
    ['Actions', []]
  ]);

  commands.forEach((command) => {
    const section = sectionOrderLabel(command.category);
    grouped.get(section)?.push(command);
  });

  return [...grouped.entries()].filter(([, items]) => items.length > 0);
}

function renderCommandRow(command, index) {
  const isActive = index === state.activeIndex;

  return `
    <li class="command-palette__item ${isActive ? 'is-active' : ''}" role="option" aria-selected="${isActive}">
      <button type="button" class="command-palette__action" data-index="${index}">
        <span class="command-palette__left">
          <span class="command-palette__icon" aria-hidden="true">${escapeHtml(command.icon)}</span>
          <span class="command-palette__content">
            <span class="command-palette__item-title">${escapeHtml(command.title)}</span>
            <span class="command-palette__item-desc">${escapeHtml(command.description)}</span>
          </span>
        </span>
        <span class="command-palette__meta">
          <span class="command-palette__badge command-palette__badge--category">${escapeHtml(command.category)}</span>
          <span class="command-palette__badge">${escapeHtml(command.shortcut)}</span>
          <span class="command-palette__badge">${escapeHtml(formatUsage(command.usage))}</span>
          <span class="command-palette__arrow" aria-hidden="true">➜</span>
        </span>
      </button>
    </li>`;
}

function renderList() {
  const { list } = queryElements();
  if (!list) return;

  const visible = state.filtered.slice(0, MAX_ITEMS);
  if (!visible.length) {
    list.innerHTML = '<li class="command-palette__empty">No matching tools found.</li>';
    return;
  }

  let globalIndex = 0;
  const sections = groupCommands(visible);
  const markup = sections.map(([section, commands]) => {
    const rows = commands.map((command) => {
      const html = renderCommandRow(command, globalIndex);
      globalIndex += 1;
      return html;
    }).join('');

    return `
      <li class="command-palette__section">
        <p class="command-palette__section-title">${escapeHtml(section)}</p>
        <ul class="command-palette__section-items">${rows}</ul>
      </li>`;
  }).join('');

  list.innerHTML = markup;
}

function filterCommands(query) {
  const normalized = query.trim().toLowerCase();
  state.filtered = normalized
    ? state.commands.filter((command) => command.searchText.includes(normalized))
    : [...state.commands];

  state.activeIndex = 0;
  renderList();
}

function setActiveIndex(nextIndex) {
  if (!state.filtered.length) {
    state.activeIndex = 0;
    renderList();
    return;
  }

  const upperBound = Math.min(state.filtered.length, MAX_ITEMS) - 1;
  state.activeIndex = Math.min(Math.max(nextIndex, 0), upperBound);
  renderList();

  const { list } = queryElements();
  const activeNode = list?.querySelector('.command-palette__item.is-active');
  activeNode?.scrollIntoView({ block: 'nearest' });
}

function focusInput() {
  const { input } = queryElements();
  if (!input) return;

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function closeCommandPalette() {
  const { modal } = queryElements();
  if (!modal || !state.open) return;

  state.open = false;
  modal.hidden = true;
  modal.classList.remove('is-open');
  document.body.classList.remove('is-modal-open');
  state.lastFocused?.focus?.();
}

function activateIndex(index = state.activeIndex) {
  const command = state.filtered[index];
  if (!command) return;

  command.onSelect?.();
}

function onModalClick(event) {
  const closeTarget = event.target.closest(SELECTORS.close);
  if (closeTarget) {
    event.preventDefault();
    closeCommandPalette();
    return;
  }

  const action = event.target.closest(SELECTORS.action);
  if (action) {
    event.preventDefault();
    activateIndex(Number(action.dataset.index));
  }
}

function onModalKeydown(event) {
  if (!state.open) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeCommandPalette();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setActiveIndex(state.activeIndex + 1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    setActiveIndex(state.activeIndex - 1);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    activateIndex();
  }
}

function bindEvents() {
  const { modal, input } = queryElements();

  modal.addEventListener('click', onModalClick);
  modal.addEventListener('keydown', onModalKeydown);
  input?.addEventListener('input', (event) => filterCommands(event.target.value || ''));

  window.addEventListener('toolnexus:statechange', () => {
    if (!state.open) return;
    buildCommandCollection();
    filterCommands(input?.value || '');
  });
}

async function loadTools() {
  if (state.tools.length) return;

  try {
    const response = await fetch('/tools/catalog', { headers: { Accept: 'application/json' } });
    const payload = response.ok ? await response.json() : [];

    state.tools = Array.isArray(payload)
      ? payload.map((tool) => ({
          slug: tool.slug,
          title: tool.title,
          description: tool.seoDescription || tool.title,
          href: `/tools/${tool.slug}`
        }))
      : [];
  } catch {
    state.tools = [];
  }

  buildCommandCollection();
  state.filtered = [...state.commands];
}

async function ensureInitialized() {
  if (state.initialized) return;

  queryElements();
  bindEvents();
  state.initialized = true;
  await loadTools();
}

async function openCommandPalette(seed = '') {
  await ensureInitialized();

  const { modal, input } = queryElements();
  if (!modal || !input) return false;

  buildCommandCollection();

  state.lastFocused = document.activeElement;
  state.open = true;
  modal.hidden = false;
  modal.classList.add('is-open');
  document.body.classList.add('is-modal-open');

  input.value = seed;
  filterCommands(seed);
  focusInput();
  return true;
}

window.closeCommandPalette = closeCommandPalette;

export { openCommandPalette, closeCommandPalette };
