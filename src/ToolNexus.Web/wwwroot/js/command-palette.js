const palette = document.getElementById('commandPalette');
const input = document.getElementById('commandPaletteInput');
const list = document.getElementById('commandPaletteList');
const themeToggle = document.getElementById('themeToggle');
const globalSearch = document.getElementById('globalToolSearch');

const RECENT_KEY = 'toolnexus.recentTools';
const PINNED_KEY = 'toolnexus.pinnedTools';
const RECENT_JSON_KEY = 'toolnexus.recentJson';
const MAX_RECENT = 8;
const MAX_RENDER = 18;

const catalog = readCatalog();
let isOpen = false;
let activeIndex = -1;
let renderedItems = [];
let previouslyFocused = null;

const activeToolPageSlug = document.querySelector('.tool-page')?.dataset.slug;
if (activeToolPageSlug) {
  writeRecentTool(activeToolPageSlug);
}

function readCatalog() {
  const source = document.getElementById('toolCatalogData');

  if (!source?.textContent) {
    return [];
  }

  try {
    const parsed = JSON.parse(source.textContent);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.slug === 'string' && typeof item.title === 'string')
      : [];
  } catch (_error) {
    return [];
  }
}

function readStorageArray(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (_error) {
    return [];
  }
}

function writeStorageArray(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch (_error) {
    // localStorage may be unavailable.
  }
}

function writeRecentTool(slug) {
  if (!slug) return;
  const next = [slug, ...readStorageArray(RECENT_KEY).filter((item) => item !== slug)].slice(0, MAX_RECENT);
  writeStorageArray(RECENT_KEY, next);
}

function closePalette() {
  if (!isOpen) return;

  isOpen = false;
  palette.hidden = true;
  document.body.classList.remove('command-palette-open');

  if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
    previouslyFocused.focus();
  }
}

function openPalette(seed = '') {
  previouslyFocused = document.activeElement;
  isOpen = true;
  palette.hidden = false;
  document.body.classList.add('command-palette-open');
  input.value = seed;
  renderItems(seed);
  requestAnimationFrame(() => input.focus());
}

function togglePinned(slug) {
  if (!slug) return;

  const pinned = readStorageArray(PINNED_KEY);
  const exists = pinned.includes(slug);
  const next = exists ? pinned.filter((item) => item !== slug) : [slug, ...pinned].slice(0, MAX_RECENT);
  writeStorageArray(PINNED_KEY, next);
  renderItems(input.value);
}

function copyRecentJson() {
  const recentJson = localStorage.getItem(RECENT_JSON_KEY);
  if (!recentJson) {
    return;
  }

  navigator.clipboard.writeText(recentJson).catch(() => {
    // Clipboard access denied.
  });
}

function runItem(item) {
  if (!item) return;

  if (item.kind === 'tool') {
    writeRecentTool(item.slug);
    window.location.assign(`/tools/${item.slug}`);
    return;
  }

  if (item.kind === 'quick-open') {
    const firstTool = renderedItems.find((entry) => entry.kind === 'tool');
    if (firstTool) {
      runItem(firstTool);
    }
    return;
  }

  if (item.kind === 'theme-toggle') {
    themeToggle?.click();
    return;
  }

  if (item.kind === 'copy-recent-json') {
    copyRecentJson();
    closePalette();
  }
}

function normalizedQuery(value) {
  return (value || '').trim().toLowerCase();
}

function toToolItem(tool, meta = '') {
  return {
    kind: 'tool',
    slug: tool.slug,
    title: tool.title,
    description: tool.description,
    meta,
    category: tool.category
  };
}

function getFilteredTools(query) {
  const lookup = normalizedQuery(query);
  const pinnedSet = new Set(readStorageArray(PINNED_KEY));
  const recentSet = new Set(readStorageArray(RECENT_KEY));

  const scored = catalog
    .filter((tool) => {
      if (!lookup) return true;
      return [tool.title, tool.slug, tool.category, tool.description]
        .join(' ')
        .toLowerCase()
        .includes(lookup);
    })
    .map((tool) => {
      const text = `${tool.title} ${tool.slug} ${tool.category} ${tool.description}`.toLowerCase();
      const startsWith = text.startsWith(lookup) ? 4 : 0;
      const pinned = pinnedSet.has(tool.slug) ? 30 : 0;
      const recent = recentSet.has(tool.slug) ? 14 : 0;
      const titleMatch = tool.title.toLowerCase().includes(lookup) ? 8 : 0;

      return { tool, score: pinned + recent + startsWith + titleMatch };
    })
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title));

  const items = [];

  if (!lookup) {
    for (const slug of readStorageArray(PINNED_KEY)) {
      const tool = catalog.find((entry) => entry.slug === slug);
      if (tool) {
        items.push(toToolItem(tool, 'Pinned'));
      }
    }

    for (const slug of readStorageArray(RECENT_KEY)) {
      const tool = catalog.find((entry) => entry.slug === slug);
      if (tool && !items.some((item) => item.slug === slug)) {
        items.push(toToolItem(tool, 'Recent'));
      }
    }
  }

  for (const candidate of scored) {
    if (items.some((item) => item.slug === candidate.tool.slug)) continue;
    items.push(toToolItem(candidate.tool, candidate.score > 0 ? 'Tool' : candidate.tool.category));
    if (items.length >= MAX_RENDER) break;
  }

  return items;
}

function getQuickActions(query) {
  const lookup = normalizedQuery(query);
  const actions = [];
  const hasRecentJson = Boolean(localStorage.getItem(RECENT_JSON_KEY));

  const quickItems = [
    { kind: 'quick-open', title: 'Quick open tool', description: 'Jump to the top matching tool instantly.' },
    { kind: 'copy-recent-json', title: 'Quick copy recent JSON', description: hasRecentJson ? 'Copy the most recent JSON output.' : 'Run a JSON tool first to enable this command.', disabled: !hasRecentJson },
    { kind: 'theme-toggle', title: 'Theme toggle', description: 'Switch between dark and light theme.' }
  ];

  for (const item of quickItems) {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    if (!lookup || haystack.includes(lookup)) {
      actions.push(item);
    }
  }

  return actions;
}

function setActiveIndex(next) {
  if (!renderedItems.length) {
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    return;
  }

  activeIndex = (next + renderedItems.length) % renderedItems.length;
  const options = list.querySelectorAll('[role="option"]');

  options.forEach((option, idx) => {
    option.setAttribute('aria-selected', idx === activeIndex ? 'true' : 'false');
    option.classList.toggle('is-active', idx === activeIndex);
  });

  const active = options[activeIndex];
  if (active?.id) {
    input.setAttribute('aria-activedescendant', active.id);
  }
  active?.scrollIntoView({ block: 'nearest' });
}

function renderItems(query = '') {
  const quick = getQuickActions(query);
  const tools = getFilteredTools(query);
  renderedItems = [...quick, ...tools].slice(0, MAX_RENDER);
  list.innerHTML = '';

  if (!renderedItems.length) {
    const empty = document.createElement('li');
    empty.className = 'command-palette__empty';
    empty.textContent = 'No commands found.';
    list.appendChild(empty);
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    return;
  }

  renderedItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'command-palette__item';
    if (item.disabled) li.classList.add('is-disabled');

    li.setAttribute('role', 'option');
    li.setAttribute('id', `command-option-${index}`);
    li.setAttribute('aria-selected', 'false');

    const content = document.createElement('div');
    content.className = 'command-palette__action';

    const textWrap = document.createElement('span');
    textWrap.className = 'command-palette__text';

    const title = document.createElement('span');
    title.className = 'command-palette__item-title';
    title.textContent = item.title;

    const desc = document.createElement('span');
    desc.className = 'command-palette__item-desc';
    if (item.kind === 'tool') {
      desc.textContent = item.description || item.category || item.slug;
    } else {
      desc.textContent = item.description;
    }

    textWrap.append(title, desc);

    const meta = document.createElement('span');
    meta.className = 'command-palette__meta';
    meta.textContent = item.meta || (item.kind === 'tool' ? item.category : 'Command');

    content.append(textWrap, meta);

    if (item.kind === 'tool') {
      const pinButton = document.createElement('button');
      pinButton.type = 'button';
      pinButton.className = 'command-palette__pin';
      pinButton.setAttribute('aria-label', `Pin ${item.title}`);
      pinButton.textContent = readStorageArray(PINNED_KEY).includes(item.slug) ? '★' : '☆';
      pinButton.addEventListener('click', (event) => {
        event.stopPropagation();
        togglePinned(item.slug);
      });
      content.appendChild(pinButton);
    }

    li.appendChild(content);

    li.addEventListener('mouseenter', () => setActiveIndex(index));
    li.addEventListener('click', () => {
      if (!item.disabled) {
        runItem(item);
      }
    });
    list.appendChild(li);
  });

  setActiveIndex(0);
}

window.addEventListener('keydown', (event) => {
  const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

  if (isShortcut) {
    event.preventDefault();
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
    return;
  }

  if (!isOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closePalette();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setActiveIndex(activeIndex + 1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    setActiveIndex(activeIndex - 1);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const item = renderedItems[activeIndex];
    if (!item?.disabled) {
      runItem(item);
    }
  }
});

input.addEventListener('input', () => renderItems(input.value));

palette.querySelectorAll('[data-command-close]').forEach((button) => {
  button.addEventListener('click', closePalette);
});

list.addEventListener('mousedown', (event) => {
  event.preventDefault();
});


if (globalSearch) {
  globalSearch.addEventListener('focus', () => {
    openPalette(globalSearch.value || '');
    globalSearch.blur();
  });

  globalSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openPalette(globalSearch.value || '');
    }
  });
}
