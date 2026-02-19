import { SQL_FORMATTER_CONFIG } from './constants.js';
import { normalizeSqlInput } from './normalizer.js';
import { tokenizeSql } from './tokenizer.js';
import { formatSqlTokens } from './formatter.js';
import { SqlFormatterUi } from './ui.js';
import { buildFriendlyError } from './errors.js';
import { getDialectConfig } from './dialects.js';

class SqlFormatterApp {
  constructor() {
    this.ui = new SqlFormatterUi();
    this.debounceTimer = null;
    this.isBusy = false;
  }

  init() {
    this.ui.dom.input.value = window.ToolNexusConfig?.sqlExampleInput ?? '';
    this.bindEvents();
    this.ui.updateStats();
    this.ui.setBusy(false);
  }

  bindEvents() {
    this.ui.dom.formatBtn.addEventListener('click', () => this.format());
    this.ui.dom.clearBtn.addEventListener('click', () => this.clear());
    this.ui.dom.copyBtn.addEventListener('click', () => this.copy());
    this.ui.dom.downloadBtn.addEventListener('click', () => this.download());

    this.ui.dom.input.addEventListener('input', () => {
      this.ui.updateStats();
      this.ui.setBusy(this.isBusy);
      if (!this.ui.dom.autoFormatToggle.checked) return;
      clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => this.format(true), SQL_FORMATTER_CONFIG.autoFormatDebounceMs);
    });

    [
      this.ui.dom.commentToggle,
      this.ui.dom.blankLineToggle,
      this.ui.dom.dialectSelect,
      this.ui.dom.keywordCaseSelect,
      this.ui.dom.indentSizeSelect,
      this.ui.dom.indentTypeSelect,
      this.ui.dom.commaStyleSelect,
      this.ui.dom.modeSelect
    ].forEach((element) => {
      element.addEventListener('change', () => {
        if (this.ui.dom.autoFormatToggle.checked && this.ui.dom.input.value.trim()) this.format(true);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        this.format();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        this.clear();
      }
    });
  }

  getOptions() {
    return {
      ...getDialectConfig(this.ui.dom.dialectSelect.value),
      keywordCase: this.ui.dom.keywordCaseSelect.value,
      indentSize: Number.parseInt(this.ui.dom.indentSizeSelect.value, 10) || 4,
      useTabs: this.ui.dom.indentTypeSelect.value === 'tabs',
      commaStyle: this.ui.dom.commaStyleSelect.value,
      pretty: this.ui.dom.modeSelect.value === 'pretty',
      preserveComments: this.ui.dom.commentToggle.checked,
      preserveBlankLines: this.ui.dom.blankLineToggle.checked,
      lineWidth: SQL_FORMATTER_CONFIG.defaultLineWidth
    };
  }

  async format(silent = false) {
    const raw = normalizeSqlInput(this.ui.dom.input.value);
    if (!raw.trim()) {
      this.ui.dom.output.value = '';
      this.ui.setResultStatus('Input required.');
      this.ui.setBusy(false);
      return;
    }

    const started = performance.now();
    this.isBusy = true;
    this.ui.clearError();
    this.ui.setBusy(true);

    const large = raw.length >= SQL_FORMATTER_CONFIG.largePayloadChars;
    this.ui.setProcessingVisible(large);
    if (large) await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const output = formatSqlTokens(tokenizeSql(raw), this.getOptions());
      this.ui.dom.output.value = output;
      this.ui.setResultStatus('SQL formatted successfully.');
      if (!silent) this.ui.toast('Formatting complete.');
    } catch (error) {
      const friendly = buildFriendlyError(error);
      this.ui.showError(friendly);
      this.ui.setResultStatus('Formatting failed.');
    }

    this.isBusy = false;
    this.ui.setProcessingVisible(false);
    this.ui.setBusy(false);
    this.ui.updateStats();
    this.ui.setExecutionMs(performance.now() - started);
  }

  clear() {
    this.ui.dom.input.value = '';
    this.ui.dom.output.value = '';
    this.ui.clearError();
    this.ui.setResultStatus('Cleared.');
    this.ui.setExecutionMs(0);
    this.ui.updateStats();
    this.ui.setBusy(false);
  }

  async copy() {
    if (!this.ui.dom.output.value) return;
    await navigator.clipboard.writeText(this.ui.dom.output.value);
    this.ui.toast('Output copied.');
  }

  download() {
    if (!this.ui.dom.output.value) return;
    const blob = new Blob([this.ui.dom.output.value], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `toolnexus-sql-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.sql`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.ui.toast('SQL downloaded.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new SqlFormatterApp();
  app.init();
});
