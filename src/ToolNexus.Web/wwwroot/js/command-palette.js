const palette = document.getElementById('commandPalette');
const input = document.getElementById('commandPaletteInput');
const list = document.getElementById('commandPaletteList');
const themeToggle = document.getElementById('themeToggle');
const globalSearch = document.getElementById('globalToolSearch');
const helpOverlay = document.getElementById('shortcutHelpOverlay');
const shortcutCoachmark = document.getElementById('shortcutCoachmark');

const RECENT_KEY = 'toolnexus.recentTools';
const PINNED_KEY = 'toolnexus.pinnedTools';
const RECENT_JSON_KEY = 'toolnexus.recentJson';
const COMMAND_HISTORY_KEY = 'toolnexus.commandHistory';
const COACHMARK_KEY = 'toolnexus.shortcutCoachmarkSeen';
const MAX_RECENT = 8;
const MAX_RENDER = 22;

const catalog = readCatalog();
let isOpen = false;
let activeIndex = -1;
let renderedItems = [];
let previouslyFocused = null;

const activeToolPageSlug = document.querySelector('.tool-page')?.dataset.slug;
if (activeToolPageSlug) {
  writeRecentTool(activeToolPageSlug);
}

init();

function init() {
  if (!palette || !input || !list) return;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(showShortcutCoachmark, 420);
  }
}

function readCatalog() {
  const source = document.getElementById('toolCatalogData');
  if (!source?.textContent) return [];

  try {
    const parsed = JSON.parse(source.textContent);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.slug === 'string' && typeof item.title === 'string')
      : [];
  } catch {
    return [];
  }
}

function readStorageArray(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeStorageArray(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // localStorage may be unavailable.
  }
}

function pushCommandHistory(commandTitle) {
  if (!commandTitle) return;
  const history = readStorageArray(COMMAND_HISTORY_KEY);
  const next = [commandTitle, ...history.filter((entry) => entry !== commandTitle)].slice(0, MAX_RECENT);
  writeStorageArray(COMMAND_HISTORY_KEY, next);
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

function toggleHelpOverlay(forceOpen) {
  if (!helpOverlay) return;

  const next = typeof forceOpen === 'boolean' ? forceOpen : helpOverlay.hidden;
  helpOverlay.hidden = !next;
  document.body.classList.toggle('shortcut-help-open', next);
  if (next) {
    helpOverlay.querySelector('.shortcut-help__dialog')?.focus();
  }
}

function showShortcutCoachmark() {
  if (!shortcutCoachmark || localStorage.getItem(COACHMARK_KEY) === 'true') return;

  shortcutCoachmark.hidden = false;
  shortcutCoachmark.classList.add('is-visible');
}

function dismissShortcutCoachmark() {
  if (!shortcutCoachmark) return;
  shortcutCoachmark.classList.remove('is-visible');
  shortcutCoachmark.hidden = true;
  localStorage.setItem(COACHMARK_KEY, 'true');
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
  if (!recentJson) return;

  navigator.clipboard.writeText(recentJson).catch(() => {
    // Clipboard access denied.
  });
}

function runItem(item) {
  if (!item) return;
  pushCommandHistory(item.title);

  if (item.kind === 'tool') {
    writeRecentTool(item.slug);
    window.location.assign(`/tools/${item.slug}`);
    return;
  }

  if (item.kind === 'quick-open') {
    const firstTool = renderedItems.find((entry) => entry.kind === 'tool');
    if (firstTool) runItem(firstTool);
    return;
  }

  if (item.kind === 'theme-toggle') {
    themeToggle?.click();
    return;
  }

  if (item.kind === 'copy-recent-json') {
    copyRecentJson();
    closePalette();
    return;
  }

  if (item.kind === 'open-recent-tool') {
    const latest = readStorageArray(RECENT_KEY)[0];
    if (latest) {
      window.location.assign(`/tools/${latest}`);
    }
  }
}

function normalizedQuery(value) {
  return (value || '').trim().toLowerCase();
}

function fuzzyScore(needle, haystack) {
  if (!needle) return 0;
  if (!haystack) return -1;

  const query = needle.toLowerCase();
  const text = haystack.toLowerCase();

  if (text.startsWith(query)) return 120;
  if (text.includes(query)) return 80 - Math.max(0, text.indexOf(query));

  let score = 0;
  let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i += 1) {
    if (text[i] === query[qi]) {
      score += 4;
      if (i > 0 && text[i - 1] === query[qi - 1]) score += 3;
      qi += 1;
    }
  }

  return qi === query.length ? score : -1;
}

function toToolItem(tool, meta = '') {
  return {
    kind: 'tool',
    slug: tool.slug,
    title: tool.title,
    description: tool.description,
    meta,
    category: tool.category,
    shortcut: '↵'
  };
}

function getFilteredTools(query) {
  const lookup = normalizedQuery(query);
  const pinnedSet = new Set(readStorageArray(PINNED_KEY));
  const recentSet = new Set(readStorageArray(RECENT_KEY));

  const scored = catalog
    .map((tool) => {
      const combined = [tool.title, tool.slug, tool.category, tool.description].join(' ');
      const fuzzy = lookup ? fuzzyScore(lookup, combined) : 0;
      if (lookup && fuzzy < 0) return null;

      const pinned = pinnedSet.has(tool.slug) ? 30 : 0;
      const recent = recentSet.has(tool.slug) ? 14 : 0;
      const categoryBonus = lookup && fuzzyScore(lookup, tool.category || '') > 0 ? 6 : 0;
      return { tool, score: fuzzy + pinned + recent + categoryBonus };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.tool.title.localeCompare(b.tool.title));

  const items = [];

  if (!lookup) {
    for (const slug of readStorageArray(PINNED_KEY)) {
      const tool = catalog.find((entry) => entry.slug === slug);
      if (tool) items.push(toToolItem(tool, 'Pinned'));
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
  const hasRecentTool = Boolean(readStorageArray(RECENT_KEY)[0]);

  const quickItems = [
    { kind: 'quick-open', title: 'Quick open tool', description: 'Jump to the top matching tool instantly.', category: 'Quick Actions', shortcut: '↵' },
    { kind: 'copy-recent-json', title: 'Quick copy recent JSON', description: hasRecentJson ? 'Copy the most recent JSON output.' : 'Run a JSON tool first to enable this command.', disabled: !hasRecentJson, category: 'Quick Actions', shortcut: '⌘C' },
    { kind: 'open-recent-tool', title: 'Open most recent tool', description: hasRecentTool ? 'Reopen your last tool immediately.' : 'Open and run a tool to enable this shortcut.', disabled: !hasRecentTool, category: 'Recents', shortcut: '⌘⇧R' },
    { kind: 'theme-toggle', title: 'Toggle theme', description: 'Switch between dark and light theme.', category: 'Display', shortcut: '⌘⇧D' }
  ];

  for (const item of quickItems) {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    if (!lookup || haystack.includes(lookup)) {
      actions.push(item);
    }
  }

  const recentCommands = readStorageArray(COMMAND_HISTORY_KEY)
    .filter((entry) => !lookup || entry.toLowerCase().includes(lookup))
    .slice(0, 3)
    .map((entry) => ({
      kind: 'history',
      title: `Recent: ${entry}`,
      description: 'Previously executed command',
      disabled: true,
      category: 'History'
    }));

  return [...actions, ...recentCommands];
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

  const item = renderedItems[activeIndex];
  if (item?.kind === 'tool') {
    input.setAttribute('data-preview', `${item.title} • ${item.category || 'Tool'}`);
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
    desc.textContent = item.kind === 'tool' ? (item.description || item.category || item.slug) : item.description;

    textWrap.append(title, desc);

    const metaWrap = document.createElement('span');
    metaWrap.className = 'command-palette__meta-wrap';

    const meta = document.createElement('span');
    meta.className = 'command-palette__meta';
    meta.textContent = item.meta || item.category || (item.kind === 'tool' ? item.category : 'Command');

    metaWrap.append(meta);

    if (item.shortcut) {
      const shortcut = document.createElement('kbd');
      shortcut.className = 'command-palette__kbd';
      shortcut.textContent = item.shortcut;
      metaWrap.append(shortcut);
    }

    content.append(textWrap, metaWrap);

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
      if (!item.disabled && item.kind !== 'history') {
        runItem(item);
      }
    });

    list.appendChild(li);
  });

  setActiveIndex(0);
}

function handleGlobalShortcuts(event) {
  const key = event.key.toLowerCase();
  const withMeta = event.metaKey || event.ctrlKey;

  if (withMeta && key === 'k') {
    event.preventDefault();
    isOpen ? closePalette() : openPalette();
    dismissShortcutCoachmark();
    return;
  }

  if (withMeta && event.shiftKey && key === 'd') {
    event.preventDefault();
    themeToggle?.click();
    dismissShortcutCoachmark();
    return;
  }

  if (withMeta && event.shiftKey && key === 'r') {
    event.preventDefault();
    const recent = readStorageArray(RECENT_KEY)[0];
    if (recent) {
      window.location.assign(`/tools/${recent}`);
    }
    dismissShortcutCoachmark();
    return;
  }

  if (withMeta && key === '/') {
    event.preventDefault();
    toggleHelpOverlay();
    dismissShortcutCoachmark();
    return;
  }

  if (event.key === 'Escape' && !helpOverlay?.hidden) {
    event.preventDefault();
    toggleHelpOverlay(false);
  }
}

window.addEventListener('keydown', (event) => {
  handleGlobalShortcuts(event);

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
    if (!item?.disabled && item?.kind !== 'history') {
      runItem(item);
    }
  }
});

input?.addEventListener('input', () => renderItems(input.value));

palette?.querySelectorAll('[data-command-close]').forEach((button) => {
  button.addEventListener('click', closePalette);
});

list?.addEventListener('mousedown', (event) => {
  event.preventDefault();
});

helpOverlay?.querySelectorAll('[data-shortcut-help-close]').forEach((button) => {
  button.addEventListener('click', () => toggleHelpOverlay(false));
});

shortcutCoachmark?.querySelectorAll('[data-shortcut-coachmark-close]').forEach((button) => {
  button.addEventListener('click', dismissShortcutCoachmark);
});

if (globalSearch) {
  globalSearch.addEventListener('focus', () => {
    openPalette(globalSearch.value || '');
    globalSearch.blur();
    dismissShortcutCoachmark();
  });

  globalSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openPalette(globalSearch.value || '');
      dismissShortcutCoachmark();
    }
  });
}

const prefetchCache = new Set();
document.addEventListener('pointerenter', (event) => {
  const anchor = event.target.closest('a[href^="/tools/"]');
  if (!anchor) return;

  const href = anchor.getAttribute('href');
  if (!href || prefetchCache.has(href)) return;
  prefetchCache.add(href);

  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.href = href;
  document.head.appendChild(prefetch);
}, { capture: true });
