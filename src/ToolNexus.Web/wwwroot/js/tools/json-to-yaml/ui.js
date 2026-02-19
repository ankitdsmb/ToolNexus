import { LARGE_INPUT_THRESHOLD } from './constants.js';
import { toUserFacingError } from './errors.js';
import { buildFormattingOptions } from './formatter.js';
import { normalizeInput } from './normalizer.js';
import { parseJsonInput } from './parser.js';
import { convertJsonToYaml } from './engine.js';
import { copyText, downloadYaml } from './exporter.js';
import { countJsonNodes, delayFrame } from './utils.js';

function getElements() {
  return {
    jsonInput: document.getElementById('jsonInput'),
    yamlOutput: document.getElementById('yamlOutput'),
    convertBtn: document.getElementById('convertBtn'),
    clearBtn: document.getElementById('clearBtn'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    autoConvert: document.getElementById('autoConvertToggle'),
    indentSelect: document.getElementById('indentSelect'),
    compactToggle: document.getElementById('compactToggle'),
    quoteAllToggle: document.getElementById('quoteAllToggle'),
    sortKeysToggle: document.getElementById('sortKeysToggle'),
    multilineToggle: document.getElementById('multilineToggle'),
    multilineStyle: document.getElementById('multilineStyle'),
    prettyToggle: document.getElementById('prettyToggle'),
    statusText: document.getElementById('statusText'),
    sizeText: document.getElementById('sizeText'),
    errorBox: document.getElementById('errorBox'),
    errorTitle: document.getElementById('errorTitle'),
    errorDetail: document.getElementById('errorDetail')
  };
}

export function mountJsonToYamlTool() {
  const els = getElements();
  if (!els.jsonInput || !els.yamlOutput) return;

  let latestYaml = '';
  let converting = false;

  const syncActions = () => {
    const hasOutput = latestYaml.length > 0;
    els.copyBtn.disabled = !hasOutput;
    els.downloadBtn.disabled = !hasOutput;
    els.convertBtn.disabled = converting || !els.jsonInput.value.trim();
    els.clearBtn.disabled = !els.jsonInput.value && !latestYaml;
  };

  const setStatus = (message) => {
    els.statusText.textContent = message;
  };

  const clearError = () => {
    els.errorBox.hidden = true;
    els.errorTitle.textContent = '';
    els.errorDetail.textContent = '';
  };

  const showError = (error) => {
    const friendly = toUserFacingError(error);
    els.errorTitle.textContent = friendly.title;
    els.errorDetail.textContent = friendly.detail;
    els.errorBox.hidden = false;
    setStatus('Fix input errors to continue');
  };

  const runConversion = async () => {
    if (converting) return;

    clearError();
    converting = true;
    setStatus('Validating JSON…');
    syncActions();

    try {
      const parsed = parseJsonInput(els.jsonInput.value);
      const inputSize = new TextEncoder().encode(els.jsonInput.value).length;
      if (inputSize > LARGE_INPUT_THRESHOLD) {
        setStatus('Large input detected. Processing…');
        await delayFrame();
      }

      const formatting = buildFormattingOptions(els);
      formatting.compact = !els.prettyToggle.checked || formatting.compact;

      const normalized = normalizeInput(parsed, formatting);
      const stats = countJsonNodes(normalized);
      latestYaml = convertJsonToYaml(normalized, formatting);

      els.yamlOutput.value = latestYaml;
      els.sizeText.textContent = `${stats.objects.toLocaleString()} object(s) · ${stats.arrays.toLocaleString()} array(s) · ${stats.primitives.toLocaleString()} primitive(s)`;
      setStatus('Conversion complete');
    } catch (error) {
      latestYaml = '';
      els.yamlOutput.value = '';
      els.sizeText.textContent = '0 object(s) · 0 array(s) · 0 primitive(s)';
      showError(error);
    } finally {
      converting = false;
      syncActions();
    }
  };

  els.convertBtn.addEventListener('click', runConversion);

  els.clearBtn.addEventListener('click', () => {
    els.jsonInput.value = '';
    els.yamlOutput.value = '';
    latestYaml = '';
    clearError();
    els.sizeText.textContent = '0 object(s) · 0 array(s) · 0 primitive(s)';
    setStatus('Cleared');
    syncActions();
  });

  els.copyBtn.addEventListener('click', async () => {
    if (!latestYaml) return;
    await copyText(latestYaml);
    setStatus('YAML copied to clipboard');
  });

  els.downloadBtn.addEventListener('click', () => {
    if (!latestYaml) return;
    downloadYaml(latestYaml);
    setStatus('YAML downloaded');
  });

  const maybeAutoConvert = () => {
    syncActions();
    if (els.autoConvert.checked && els.jsonInput.value.trim()) {
      runConversion();
    }
  };

  els.jsonInput.addEventListener('input', maybeAutoConvert);
  [
    els.indentSelect,
    els.compactToggle,
    els.quoteAllToggle,
    els.sortKeysToggle,
    els.multilineToggle,
    els.multilineStyle,
    els.prettyToggle
  ].forEach(control => control.addEventListener('change', maybeAutoConvert));

  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runConversion();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      els.clearBtn.click();
    }
  });

  syncActions();
}
