const SELECTORS = {
  modal: '#commandPaletteModal',
  input: '#commandPaletteInput',
  list: '#commandPaletteList',
  close: '[data-command-close]',
  action: '.command-palette__action'
};

const state = {
  initialized: false,
  open: false,
  tools: [],
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
        <h2 id="commandPaletteTitle" class="command-palette__title">Command palette</h2>
        <button class="command-palette__close" type="button" data-command-close aria-label="Close command palette">✕</button>
      </header>
      <label class="u-sr-only" for="commandPaletteInput">Search tools</label>
      <input id="commandPaletteInput" class="command-palette__input" type="text" placeholder="Search tools and actions..." autocomplete="off" />
      <ul id="commandPaletteList" class="command-palette__list" role="listbox"></ul>
    </section>`;

  document.body.append(wrapper);
  return wrapper;
}

function queryElements() {
  if (state.elements) {
    return state.elements;
  }

  const modal = document.querySelector(SELECTORS.modal) || createCommandPalette();
  state.elements = {
    modal,
    input: modal.querySelector(SELECTORS.input),
    list: modal.querySelector(SELECTORS.list)
  };

  return state.elements;
}

async function loadTools() {
  if (state.tools.length) {
    return;
  }

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

  state.filtered = [...state.tools];
}

function renderList() {
  const { list } = queryElements();
  if (!list) {
    return;
  }

  const visible = state.filtered.slice(0, 12);
  if (!visible.length) {
    list.innerHTML = '<li class="command-palette__empty">No matching tools found.</li>';
    return;
  }

  list.innerHTML = visible
    .map(
      (tool, index) => `
      <li class="command-palette__item ${index === state.activeIndex ? 'is-active' : ''}" role="option" aria-selected="${index === state.activeIndex}">
        <button type="button" class="command-palette__action" data-index="${index}">
          <span class="command-palette__item-title">${tool.title}</span>
          <span class="command-palette__item-desc">${tool.description}</span>
        </button>
      </li>`
    )
    .join('');
}

function filterTools(query) {
  const normalized = query.trim().toLowerCase();

  state.filtered = normalized
    ? state.tools.filter((tool) => (`${tool.title} ${tool.slug} ${tool.description}`).toLowerCase().includes(normalized))
    : [...state.tools];

  state.activeIndex = 0;
  renderList();
}

function focusInput() {
  const { input } = queryElements();
  if (!input) {
    return;
  }

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function closeCommandPalette() {
  const { modal } = queryElements();
  if (!modal || !state.open) {
    return;
  }

  state.open = false;
  modal.hidden = true;
  modal.classList.remove('is-open');
  document.body.classList.remove('is-modal-open');
  state.lastFocused?.focus?.();
}

function activateIndex(index = state.activeIndex) {
  const item = state.filtered[index];
  if (!item) {
    return;
  }

  window.location.assign(item.href);
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
  if (!state.open) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeCommandPalette();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    state.activeIndex = Math.min(state.activeIndex + 1, Math.max(state.filtered.length - 1, 0));
    renderList();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    state.activeIndex = Math.max(state.activeIndex - 1, 0);
    renderList();
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

  input?.addEventListener('input', (event) => {
    filterTools(event.target.value || '');
  });
}

async function ensureInitialized() {
  if (state.initialized) {
    return;
  }

  queryElements();
  bindEvents();
  state.initialized = true;
  await loadTools();
}

async function openCommandPalette(seed = '') {
  await ensureInitialized();

  const { modal, input } = queryElements();
  if (!modal || !input) {
    return false;
  }

  state.lastFocused = document.activeElement;
  state.open = true;
  modal.hidden = false;
  modal.classList.add('is-open');
  document.body.classList.add('is-modal-open');

  input.value = seed;
  filterTools(seed);
  focusInput();
  return true;
}

window.closeCommandPalette = closeCommandPalette;

export { openCommandPalette, closeCommandPalette };
