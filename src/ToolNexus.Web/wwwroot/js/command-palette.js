const state = {
  initialized: false,
  isOpen: false,
  activeIndex: 0,
  tools: [],
  filtered: []
};

const selectors = {
  modal: '#commandPaletteModal',
  input: '#commandPaletteInput',
  list: '#commandPaletteList',
  trigger: '[data-command-palette-trigger]',
  close: '[data-command-close]'
};

function getElements() {
  return {
    modal: document.querySelector(selectors.modal),
    input: document.querySelector(selectors.input),
    list: document.querySelector(selectors.list)
  };
}

function isEditableTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.closest('[contenteditable="true"]')) return true;
  const tagName = target.tagName.toLowerCase();
  return ['input', 'textarea', 'select'].includes(tagName);
}

async function loadCatalog() {
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
}

function renderList() {
  const { list } = getElements();
  if (!list) return;

  const items = state.filtered.slice(0, 12);
  if (!items.length) {
    list.innerHTML = '<li class="command-palette__empty">No matching tools found.</li>';
    return;
  }

  list.innerHTML = items.map((tool, index) => `
    <li class="command-palette__item ${index === state.activeIndex ? 'is-active' : ''}" role="option" aria-selected="${index === state.activeIndex}">
      <button type="button" class="command-palette__action" data-index="${index}" data-href="${tool.href}">
        <span class="command-palette__item-title">${tool.title}</span>
        <span class="command-palette__item-desc">${tool.description}</span>
      </button>
    </li>`).join('');
}

function filterTools(query) {
  const normalized = query.trim().toLowerCase();
  state.filtered = !normalized
    ? [...state.tools]
    : state.tools.filter((tool) => (`${tool.title} ${tool.slug} ${tool.description}`).toLowerCase().includes(normalized));
  state.activeIndex = 0;
  renderList();
}

function openCommandPalette(seed = '') {
  const { modal, input } = getElements();
  if (!modal || !input) return;

  state.isOpen = true;
  modal.hidden = false;
  modal.classList.add('is-open');
  document.body.classList.add('is-modal-open');
  input.value = seed;
  filterTools(seed);
  requestAnimationFrame(() => input.focus());
}

function closeCommandPalette() {
  const { modal } = getElements();
  if (!modal || !state.isOpen) return;

  state.isOpen = false;
  modal.classList.remove('is-open');
  modal.hidden = true;
  document.body.classList.remove('is-modal-open');
}

function runActiveAction(index = state.activeIndex) {
  const tool = state.filtered[index];
  if (!tool) return;
  window.location.assign(tool.href);
}

function handleDocumentClick(event) {
  const trigger = event.target.closest(selectors.trigger);
  if (trigger) {
    event.preventDefault();
    openCommandPalette();
    return;
  }

  const closeButton = event.target.closest(selectors.close);
  if (closeButton) {
    event.preventDefault();
    closeCommandPalette();
    return;
  }

  const action = event.target.closest('.command-palette__action');
  if (action) {
    event.preventDefault();
    runActiveAction(Number(action.dataset.index));
  }
}

function handleDocumentKeydown(event) {
  const key = event.key.toLowerCase();
  const withMeta = event.ctrlKey || event.metaKey;
  const editable = isEditableTarget(event.target);

  if (withMeta && key === 'k') {
    event.preventDefault();
    openCommandPalette();
    return;
  }

  if (!withMeta && key === '?' && !editable) {
    event.preventDefault();
    openCommandPalette('shortcut');
    return;
  }

  if (!state.isOpen) {
    return;
  }

  if (editable && !withMeta) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCommandPalette();
    }
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
    runActiveAction();
  }
}

function bindInput() {
  const { input } = getElements();
  if (!input) return;

  input.addEventListener('input', (event) => {
    filterTools(event.target.value || '');
  });
}

async function init() {
  if (state.initialized) return;
  state.initialized = true;

  await loadCatalog();
  state.filtered = [...state.tools];
  bindInput();

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);
}

window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export { openCommandPalette, closeCommandPalette };
