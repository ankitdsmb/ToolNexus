import { getKeyboardEventManager } from '../keyboard-event-manager.js';
import { toUserError } from './errors.js';
import { generateUuidByVersion } from './engine.js';
import { formatUuid } from './format.js';
import { clampQuantity, downloadTextFile, nowIso, UUID_LIMITS } from './helpers.js';
import { createInitialState } from './state.js';

const CHUNK_SIZE = 200;
const APP_INSTANCES = new WeakMap();

function byId(id, root = document) {
  return root.querySelector(`#${id}`);
}

export function initializeUuidGeneratorUi(root = byId('uuidGeneratorApp')?.closest('#uuidGeneratorApp')) {
  root = root || byId('uuidGeneratorApp');
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const state = createInitialState();
  const disposers = [];
  const dom = {
    version: byId('uuidVersion', root),
    quantity: byId('uuidQuantity', root),
    caseMode: byId('uuidCase', root),
    removeHyphens: byId('uuidNoHyphen', root),
    wrapper: byId('uuidWrapper', root),
    customTemplate: byId('uuidTemplate', root),
    enforceUnique: byId('uuidUnique', root),
    autoGenerate: byId('uuidAutoGenerate', root),
    generate: byId('uuidGenerateBtn', root),
    clear: byId('uuidClearBtn', root),
    copyOne: byId('uuidCopyBtn', root),
    copyAll: byId('uuidCopyAllBtn', root),
    download: byId('uuidDownloadBtn', root),
    output: byId('uuidOutput', root),
    status: byId('uuidStatus', root),
    indicator: byId('uuidIndicator', root),
    metrics: byId('uuidMetrics', root),
    errorPanel: byId('uuidErrorPanel', root),
    errorTitle: byId('uuidErrorTitle', root),
    errorText: byId('uuidErrorText', root)
  };

  function on(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
    disposers.push(() => el.removeEventListener(ev, fn));
  }

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

  on(dom.generate, 'click', () => { void generateBatch(); });
  on(dom.clear, 'click', clearAll);
  on(dom.copyOne, 'click', () => {
    if (state.generated[0]) void writeClipboard(state.generated[0], 'Copied first UUID.');
  });
  on(dom.copyAll, 'click', () => {
    if (state.generated.length > 0) void writeClipboard(state.generated.join('\n'), 'Copied all UUIDs.');
  });
  on(dom.download, 'click', () => {
    if (state.generated.length > 0) {
      downloadTextFile(`uuids-${Date.now()}.txt`, state.generated.join('\n'));
      dom.status.textContent = 'Downloaded UUID list.';
    }
  });

  on(root, 'change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    syncState();
    if (state.autoGenerate && !state.generating) {
      void generateBatch();
    }
  });

  const disposeKeyboard = getKeyboardEventManager().register({
    root,
    onKeydown: (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        if (!state.generating) {
          void generateBatch();
        }
      }

      if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        clearAll();
      }
    }
  });

  dom.quantity.min = String(UUID_LIMITS.minQuantity);
  dom.quantity.max = String(UUID_LIMITS.maxQuantity);
  renderOutput();

  const app = {
    destroy() {
      disposeKeyboard?.();
      while (disposers.length) disposers.pop()?.();
      APP_INSTANCES.delete(root);
    }
  };

  APP_INSTANCES.set(root, app);
  return app;
}
