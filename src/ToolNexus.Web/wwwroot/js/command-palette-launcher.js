let commandPaletteModulePromise;
let suppressHeaderFocusOpen = false;

function getSeedFromHeaderSearch() {
  return document.getElementById('globalToolSearch')?.value || '';
}

function loadCommandPaletteModule() {
  if (!commandPaletteModulePromise) {
    commandPaletteModulePromise = import('./command-palette.js');
  }

  return commandPaletteModulePromise;
}

async function openCommandPalette(seed = '') {
  const module = await loadCommandPaletteModule();
  await module.openCommandPalette(seed);
}

async function toggleCommandPalette(seed = '') {
  const module = await loadCommandPaletteModule();
  module.toggleCommandPalette(seed);
}

function bindHeaderSearch() {
  const globalSearch = document.getElementById('globalToolSearch');
  const paletteTrigger = document.querySelector('[data-open-palette]');

  paletteTrigger?.addEventListener('click', (event) => {
    event.preventDefault();
    openCommandPalette(getSeedFromHeaderSearch());
  });

  if (!globalSearch) return;

  globalSearch.addEventListener('click', (event) => {
    event.preventDefault();
    if (suppressHeaderFocusOpen) {
      suppressHeaderFocusOpen = false;
      return;
    }

    openCommandPalette(globalSearch.value || '');
    globalSearch.blur();
  });

  globalSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    openCommandPalette(globalSearch.value || '');
  });

  window.addEventListener('toolnexus:modalchange', (event) => {
    if (event?.detail?.activeModalId !== null) return;
    suppressHeaderFocusOpen = true;
  });
}

function bindShortcuts() {
  window.addEventListener('keydown', (event) => {
    if (event.isComposing) return;

    const key = event.key.toLowerCase();
    const withMeta = event.metaKey || event.ctrlKey;

    if (withMeta && key === 'k') {
      event.preventDefault();
      toggleCommandPalette(getSeedFromHeaderSearch());
      return;
    }

    if (withMeta && key === '/') {
      event.preventDefault();
      openCommandPalette('shortcuts');
    }
  });
}

function init() {
  bindHeaderSearch();
  bindShortcuts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
