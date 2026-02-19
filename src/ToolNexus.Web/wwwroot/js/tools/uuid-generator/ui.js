import { toUserError } from './errors.js';
import { generateUuidByVersion } from './engine.js';
import { formatUuid } from './format.js';
import { clampQuantity, downloadTextFile, nowIso, UUID_LIMITS } from './helpers.js';
import { createInitialState } from './state.js';

const CHUNK_SIZE = 200;

function byId(id) {
  return document.getElementById(id);
}

export function initializeUuidGeneratorUi() {
  const root = byId('uuidGeneratorApp');
  if (!root) return;

  const state = createInitialState();
  const dom = {
    version: byId('uuidVersion'),
    quantity: byId('uuidQuantity'),
    caseMode: byId('uuidCase'),
    removeHyphens: byId('uuidNoHyphen'),
    wrapper: byId('uuidWrapper'),
    customTemplate: byId('uuidTemplate'),
    enforceUnique: byId('uuidUnique'),
    autoGenerate: byId('uuidAutoGenerate'),
    generate: byId('uuidGenerateBtn'),
    clear: byId('uuidClearBtn'),
    copyOne: byId('uuidCopyBtn'),
    copyAll: byId('uuidCopyAllBtn'),
    download: byId('uuidDownloadBtn'),
    output: byId('uuidOutput'),
    status: byId('uuidStatus'),
    indicator: byId('uuidIndicator'),
    metrics: byId('uuidMetrics'),
    errorPanel: byId('uuidErrorPanel'),
    errorTitle: byId('uuidErrorTitle'),
    errorText: byId('uuidErrorText')
  };

  function syncState() {
    state.version = dom.version.value;
    state.quantity = clampQuantity(dom.quantity.value);
    dom.quantity.value = String(state.quantity);
    state.caseMode = dom.caseMode.value;
    state.removeHyphens = dom.removeHyphens.checked;
    state.wrapper = dom.wrapper.value;
    state.customTemplate = dom.customTemplate.value;
    state.enforceUnique = dom.enforceUnique.checked;
    state.autoGenerate = dom.autoGenerate.checked;
  }

  function setError(error) {
    const userError = toUserError(error);
    dom.errorTitle.textContent = userError.title;
    dom.errorText.textContent = userError.message;
    dom.errorPanel.hidden = false;
  }

  function clearError() {
    dom.errorPanel.hidden = true;
    dom.errorTitle.textContent = '';
    dom.errorText.textContent = '';
  }

  function setBusy(busy) {
    state.generating = busy;
    dom.generate.disabled = busy;
    dom.copyOne.disabled = busy || state.generated.length === 0;
    dom.copyAll.disabled = busy || state.generated.length === 0;
    dom.download.disabled = busy || state.generated.length === 0;
    dom.indicator.textContent = busy ? 'Generating…' : 'Ready';
    dom.indicator.dataset.state = busy ? 'busy' : 'idle';
  }

  function renderOutput() {
    const outputLines = state.generated.slice(0, UUID_LIMITS.maxPreviewRows);
    const suffix = state.generated.length > outputLines.length
      ? `\n… ${state.generated.length - outputLines.length} more hidden for performance`
      : '';

    dom.output.value = `${outputLines.join('\n')}${suffix}`;
    dom.metrics.textContent = `Count: ${state.generated.length} • Generated: ${state.lastGeneratedAt ?? '—'}`;
    dom.status.textContent = state.generated.length > 0
      ? `Generated ${state.generated.length} UUID${state.generated.length === 1 ? '' : 's'}`
      : 'No UUIDs generated yet';

    dom.copyOne.disabled = state.generated.length === 0;
    dom.copyAll.disabled = state.generated.length === 0;
    dom.download.disabled = state.generated.length === 0;
  }

  async function generateBatch() {
    syncState();
    clearError();
    setBusy(true);

    const started = performance.now();
    const set = state.enforceUnique ? new Set() : null;
    const generated = [];

    try {
      for (let index = 0; index < state.quantity; index += 1) {
        const raw = generateUuidByVersion(state.version);
        const formatted = formatUuid(raw, state);

        if (!set || !set.has(formatted)) {
          generated.push(formatted);
          set?.add(formatted);
        }

        if ((index + 1) % CHUNK_SIZE === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      state.generated = generated;
      state.lastGeneratedAt = nowIso();
      const duration = Math.round(performance.now() - started);
      dom.status.textContent = `Generated ${generated.length} UUID${generated.length === 1 ? '' : 's'} in ${duration}ms`;
      renderOutput();
    } catch (error) {
      setError(error);
    } finally {
      setBusy(false);
    }
  }

  async function writeClipboard(text, feedback) {
    try {
      await navigator.clipboard.writeText(text);
      dom.status.textContent = feedback;
    } catch {
      dom.status.textContent = 'Copy failed. Clipboard permission is unavailable.';
    }
  }

  function clearAll() {
    state.generated = [];
    state.lastGeneratedAt = null;
    renderOutput();
    clearError();
  }

  dom.generate.addEventListener('click', generateBatch);
  dom.clear.addEventListener('click', clearAll);
  dom.copyOne.addEventListener('click', () => {
    if (state.generated[0]) writeClipboard(state.generated[0], 'Copied first UUID.');
  });
  dom.copyAll.addEventListener('click', () => {
    if (state.generated.length > 0) writeClipboard(state.generated.join('\n'), 'Copied all UUIDs.');
  });
  dom.download.addEventListener('click', () => {
    if (state.generated.length > 0) {
      downloadTextFile(`uuids-${Date.now()}.txt`, state.generated.join('\n'));
      dom.status.textContent = 'Downloaded UUID list.';
    }
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    syncState();
    if (state.autoGenerate && !state.generating) {
      generateBatch();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!state.generating) {
        generateBatch();
      }
    }

    if (event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clearAll();
    }
  });

  dom.quantity.min = String(UUID_LIMITS.minQuantity);
  dom.quantity.max = String(UUID_LIMITS.maxQuantity);
  renderOutput();
}
