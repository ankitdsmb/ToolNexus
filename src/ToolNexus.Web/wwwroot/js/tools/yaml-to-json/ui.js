import { LARGE_INPUT_BYTES, PROCESSING_SPINNER_MIN_MS } from './constants.js';
import { toUserFacingError } from './errors.js';
import { formatJson, getFormattingOptions } from './formatter.js';
import { computeNodeStats, getInputMetrics, yieldToBrowser } from './helpers.js';
import { normalizeYamlInput } from './normalizer.js';
import { parseYaml } from './parser.js';
import { convertYamlToJsonValue } from './engine.js';
import { copyText, downloadJson } from './exporter.js';

function getElements() {
  return {
    yamlInput: document.getElementById('yamlInput'),
    jsonOutput: document.getElementById('jsonOutput'),
    convertBtn: document.getElementById('convertBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    autoConvertToggle: document.getElementById('autoConvertToggle'),
    prettyToggle: document.getElementById('prettyToggle'),
    indentSelect: document.getElementById('indentSelect'),
    sortKeysToggle: document.getElementById('sortKeysToggle'),
    autoTypesToggle: document.getElementById('autoTypesToggle'),
    strictStringsToggle: document.getElementById('strictStringsToggle'),
    parseDatesToggle: document.getElementById('parseDatesToggle'),
    statusText: document.getElementById('statusText'),
    metricsText: document.getElementById('metricsText'),
    errorBox: document.getElementById('errorBox'),
    errorTitle: document.getElementById('errorTitle'),
    errorDetail: document.getElementById('errorDetail')
  };
}

export function mountYamlToJsonTool() {
  const els = getElements();
  if (!els.yamlInput || !els.jsonOutput) {
    return;
  }

  let latestJson = '';
  let converting = false;

  const syncButtons = () => {
    const hasInput = Boolean(els.yamlInput.value.trim());
    const hasOutput = Boolean(latestJson);
    els.convertBtn.disabled = converting || !hasInput;
    els.clearBtn.disabled = converting && !hasInput && !hasOutput;
    els.copyBtn.disabled = converting || !hasOutput;
    els.downloadBtn.disabled = converting || !hasOutput;
  };

  const setStatus = (text) => {
    els.statusText.textContent = text;
  };

  const clearError = () => {
    els.errorBox.hidden = true;
    els.errorTitle.textContent = '';
    els.errorDetail.textContent = '';
  };

  const setMetrics = (yamlMetrics, treeMetrics) => {
    els.metricsText.textContent = `${yamlMetrics.lines.toLocaleString()} line(s) · ${(yamlMetrics.bytes / 1024).toFixed(1)} KB · ${treeMetrics.objects.toLocaleString()} object(s) · ${treeMetrics.arrays.toLocaleString()} array(s) · ${treeMetrics.primitives.toLocaleString()} primitive(s)`;
  };

  const showError = (error) => {
    const friendly = toUserFacingError(error);
    els.errorTitle.textContent = friendly.title;
    els.errorDetail.textContent = friendly.detail;
    els.errorBox.hidden = false;
    setStatus('Resolve YAML errors and retry');
  };

  const runConversion = async () => {
    if (converting) {
      return;
    }

    const normalizedInput = normalizeYamlInput(els.yamlInput.value);
    if (!normalizedInput) {
      latestJson = '';
      els.jsonOutput.value = '';
      setStatus('Input is empty');
      syncButtons();
      return;
    }

    clearError();
    converting = true;
    setStatus('Parsing YAML…');
    syncButtons();

    const yamlMetrics = getInputMetrics(normalizedInput);

    try {
      const startedAt = performance.now();
      if (yamlMetrics.bytes > LARGE_INPUT_BYTES) {
        setStatus('Large YAML detected. Processing safely…');
        await yieldToBrowser();
      }

      const options = getFormattingOptions(els);
      if (options.strictStrings) {
        options.autoTypes = false;
      }

      const parsed = parseYaml(normalizedInput, options);
      const jsonValue = convertYamlToJsonValue(parsed, options);
      latestJson = formatJson(jsonValue, options);
      els.jsonOutput.value = latestJson;

      const stats = computeNodeStats(jsonValue);
      setMetrics(yamlMetrics, stats);

      const elapsed = performance.now() - startedAt;
      if (elapsed < PROCESSING_SPINNER_MIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, PROCESSING_SPINNER_MIN_MS - elapsed));
      }

      setStatus('Conversion complete');
    } catch (error) {
      latestJson = '';
      els.jsonOutput.value = '';
      setMetrics(yamlMetrics, { objects: 0, arrays: 0, primitives: 0 });
      showError(error);
    } finally {
      converting = false;
      syncButtons();
    }
  };

  const clearAll = () => {
    els.yamlInput.value = '';
    els.jsonOutput.value = '';
    latestJson = '';
    clearError();
    els.metricsText.textContent = '0 line(s) · 0.0 KB · 0 object(s) · 0 array(s) · 0 primitive(s)';
    setStatus('Cleared');
    syncButtons();
  };

  const maybeAutoConvert = () => {
    syncButtons();
    if (els.autoConvertToggle.checked && els.yamlInput.value.trim()) {
      runConversion();
    }
  };

  els.convertBtn.addEventListener('click', runConversion);
  els.clearBtn.addEventListener('click', clearAll);
  els.copyBtn.addEventListener('click', async () => {
    if (!latestJson) {
      return;
    }

    await copyText(latestJson);
    setStatus('JSON copied to clipboard');
  });

  els.downloadBtn.addEventListener('click', () => {
    if (!latestJson) {
      return;
    }

    downloadJson(latestJson);
    setStatus('JSON downloaded');
  });

  els.yamlInput.addEventListener('input', maybeAutoConvert);
  [
    els.prettyToggle,
    els.indentSelect,
    els.sortKeysToggle,
    els.autoTypesToggle,
    els.strictStringsToggle,
    els.parseDatesToggle
  ].forEach((control) => control.addEventListener('change', maybeAutoConvert));

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runConversion();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clearAll();
    }
  });

  syncButtons();
}
