import { getKeyboardEventManager } from './keyboard-event-manager.js';
import { runCssMinifier, toUserErrorMessage } from './css-minifier.api.js';
import { getCssMinifierDom } from './css-minifier.dom.js';

const DOWNLOAD_FILE_NAME = 'optimized.css';
const AUTO_MINIFY_DEBOUNCE_MS = 280;
const APP_INSTANCES = new WeakMap();

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getByteSize(value) {
  return new TextEncoder().encode(value).length;
}

class CssMinifierApp {
  constructor(root) {
    this.dom = getCssMinifierDom(root);
    this.disposeHandlers = [];
    this.disposeKeyboard = null;
    this.autoTimer = 0;
    this.latestArtifactId = null;

    if (!this.dom?.inputEditor || !this.dom?.outputEditor || !this.dom?.runBtn) return;
    this.initializeUi();
    this.bindEvents();
  }

  initializeUi() {
    if (this.dom.actionSelect) this.dom.actionSelect.value = this.dom.actionSelect.options[0]?.value ?? '';
    if (this.dom.shortcutHint) this.dom.shortcutHint.textContent = 'Shortcuts: Ctrl/Cmd + Enter to analyze, Ctrl/Cmd + L to clear input';
    if (this.dom.outputHeading) this.dom.outputHeading.textContent = 'Optimized CSS Output';
    if (this.dom.runBtn.querySelector('.tool-btn__label')) this.dom.runBtn.querySelector('.tool-btn__label').textContent = 'Analyze & Optimize CSS';
    if (this.dom.copyBtn) this.dom.copyBtn.textContent = 'Copy Optimized CSS';
    if (this.dom.downloadBtn) this.dom.downloadBtn.textContent = 'Download optimized CSS';
  }

  on(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    this.disposeHandlers.push(() => element.removeEventListener(eventName, handler));
  }

  renderStatus(message, level = 'info') {
    const status = this.dom.outputStatus;
    if (!status) return;

    status.textContent = message;
    status.classList.remove('result-indicator--idle', 'result-indicator--success', 'result-indicator--failure');
    if (level === 'success') status.classList.add('result-indicator--success');
    else if (level === 'error') status.classList.add('result-indicator--failure');
    else status.classList.add('result-indicator--idle');
  }

  updateMetrics(original, minified) {
    if (!this.dom.metrics) return;
    const originalSize = getByteSize(original);
    const minifiedSize = getByteSize(minified);
    const reduction = originalSize === 0 ? 0 : ((1 - (minifiedSize / originalSize)) * 100);

    this.dom.metrics.innerHTML = `<span>Total CSS: ${formatBytes(originalSize)}</span><span>Optimized CSS: ${formatBytes(minifiedSize)}</span><span>Size reduction: ${reduction.toFixed(1)}%</span>`;
    this.updateUsageReport(originalSize, minifiedSize);
  }

  detectFramework(css) {
    const normalized = (css ?? '').toLowerCase();
    if (normalized.includes('.container') && normalized.includes('.row') && normalized.includes('.col-')) return 'Bootstrap';
    if (normalized.includes('--tw-') || normalized.includes('.sm\:')) return 'Tailwind CSS';
    if (normalized.includes('.grid-x') || normalized.includes('.cell')) return 'Foundation';
    return 'Custom / Unknown';
  }

  updateUsageReport(totalBytes, optimizedBytes, frameworkOverride = null) {
    const normalizedTotal = Math.max(totalBytes, 1);
    const estimatedUnusedBytes = Math.max(totalBytes - optimizedBytes, 0);
    const estimatedUsedBytes = normalizedTotal - estimatedUnusedBytes;
    const optimizationPercent = (estimatedUnusedBytes / normalizedTotal) * 100;
    const usedPercent = 100 - optimizationPercent;
    const framework = frameworkOverride ?? this.detectFramework(this.dom.inputEditor?.value ?? '');
    const speedHint = optimizationPercent > 40 ? 'High' : optimizationPercent > 20 ? 'Medium' : 'Low';
    const speedGainMin = Math.max(Math.round(optimizationPercent * 0.25), 3);
    const speedGainMax = Math.max(Math.round(optimizationPercent * 0.45), speedGainMin + 5);

    if (this.dom.totalCssStat) this.dom.totalCssStat.textContent = `Total CSS: ${(normalizedTotal / 1024).toFixed(1)} KB`;
    if (this.dom.usedCssStat) this.dom.usedCssStat.textContent = `Used CSS: ${(estimatedUsedBytes / 1024).toFixed(1)} KB`;
    if (this.dom.unusedCssStat) this.dom.unusedCssStat.textContent = `Unused CSS: ${(estimatedUnusedBytes / 1024).toFixed(1)} KB`;
    if (this.dom.optimizationStat) this.dom.optimizationStat.textContent = `Optimization potential: ${optimizationPercent.toFixed(1)}%`;
    if (this.dom.usedCssBar) this.dom.usedCssBar.value = Math.max(Math.min(usedPercent, 100), 0);
    if (this.dom.unusedCssBar) this.dom.unusedCssBar.value = Math.max(Math.min(optimizationPercent, 100), 0);

    if (this.dom.insights) {
      this.dom.insights.innerHTML = `<p>Unused CSS detected: ${(estimatedUnusedBytes / 1024).toFixed(1)} KB</p>
        <p>Potential speed improvement: ${speedHint}</p>
        <p>Estimated page speed gain: ${speedGainMin}-${speedGainMax}%</p>
        <p>Framework detected: ${framework}</p>
        <p>Unused CSS affects: Largest Contentful Paint (LCP), First Contentful Paint (FCP)</p>
        <p>Cleanup suggestions: Remove unused selectors, split CSS by page, use critical CSS, and load non-critical CSS asynchronously.</p>`;
    }
  }

  async runUrlScan(url) {
    this.renderStatus('Submitting website scan…', 'info');
    const response = await fetch('/api/tools/css/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error ?? 'Unable to start scan.');
    }

    const { jobId } = await response.json();
    if (!jobId) {
      throw new Error('Server did not return a scan job id.');
    }

    this.renderStatus('Scan in progress…', 'info');

    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      const pollResponse = await fetch(`/api/tools/css/result/${encodeURIComponent(jobId)}`);
      if (!pollResponse.ok) continue;

      const payload = await pollResponse.json();
      if (payload.status === 'Completed' && payload.result) {
        const { totalCss, usedCss, unusedCss, framework, artifactId } = payload.result;
        this.latestArtifactId = artifactId ?? null;
        this.updateUsageReport(totalCss ?? 0, usedCss ?? 0, framework ?? 'Unknown');
        if (this.dom.outputEditor.value.trim().length === 0) {
          this.dom.outputEditor.value = `/* Website scan complete for ${url}. Download optimized artifact to retrieve generated CSS. */`;
        }
        this.renderStatus('Website scan complete', 'success');
        return;
      }

      if (payload.status === 'Failed') {
        throw new Error(payload.error ?? 'Scan failed.');
      }
    }

    throw new Error('Scan timed out. Please try again.');
  }

  clearInput() {
    this.dom.inputEditor.value = '';
    this.dom.outputEditor.value = '';
    this.latestArtifactId = null;
    if (this.dom.warnings) {
      this.dom.warnings.hidden = true;
      this.dom.warnings.innerHTML = '';
    }
    this.updateMetrics('', '');
    this.renderStatus('Cleared', 'info');
  }

  async run(action = 'minify', input = this.dom.inputEditor.value) {
    this.renderStatus('Processing…', 'info');

    try {
      const output = await runCssMinifier(action, input, {
        preserveImportantComments: Boolean(this.dom.preserveToggle?.checked)
      });
      this.dom.outputEditor.value = output;
      this.updateMetrics(input ?? '', output);
      this.renderStatus('Analysis complete', 'success');
      if (this.dom.warnings) {
        this.dom.warnings.hidden = true;
        this.dom.warnings.innerHTML = '';
      }
      return output;
    } catch (error) {
      if (this.dom.warnings) {
        this.dom.warnings.hidden = false;
        this.dom.warnings.innerHTML = `<strong>Minification Failed</strong><p>${toUserErrorMessage(error)}</p>`;
      }
      this.renderStatus('Analysis failed', 'error');
      throw new Error(toUserErrorMessage(error));
    }
  }

  bindEvents() {
    this.on(this.dom.runBtn, 'click', () => { void this.run(); });
    this.on(this.dom.clearButton, 'click', () => this.clearInput());

    this.on(this.dom.scanUrlBtn, 'click', () => {
      const url = this.dom.websiteUrlInput?.value?.trim();
      if (!url) {
        this.renderStatus('Enter a website URL to scan', 'error');
        return;
      }

      void this.runUrlScan(url).catch((error) => {
        this.renderStatus(error.message || 'Scan failed', 'error');
      });
    });

    this.on(this.dom.inputEditor, 'keyup', () => {
      if (!this.dom.autoToggle?.checked) return;
      window.clearTimeout(this.autoTimer);
      this.autoTimer = window.setTimeout(() => {
        this.dom.runBtn.click();
      }, AUTO_MINIFY_DEBOUNCE_MS);
    });

    this.on(this.dom.downloadBtn, 'click', async () => {
      if (this.latestArtifactId) {
        const response = await fetch('/api/tools/css/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifactId: this.latestArtifactId })
        });

        if (response.ok) {
          const blob = await response.blob();
          const anchor = document.createElement('a');
          anchor.href = URL.createObjectURL(blob);
          anchor.download = DOWNLOAD_FILE_NAME;
          anchor.click();
          URL.revokeObjectURL(anchor.href);
          return;
        }
      }

      const output = this.dom.outputEditor.value;
      if (!output.trim()) return;
      const blob = new Blob([output], { type: 'text/css' });
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = DOWNLOAD_FILE_NAME;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    });

    this.disposeKeyboard = getKeyboardEventManager().register({
      root: this.dom.root,
      onKeydown: (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;

        if (event.key.toLowerCase() === 'l') {
          event.preventDefault();
          this.clearInput();
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          void this.run();
        }
      }
    });
  }

  destroy() {
    this.disposeKeyboard?.();
    window.clearTimeout(this.autoTimer);
    while (this.disposeHandlers.length) this.disposeHandlers.pop()?.();
    if (this.dom.clearButtonCreated) this.dom.clearButton?.remove();
    if (this.dom.optionsCreated) this.dom.options?.remove();
    if (this.dom.metricsCreated) this.dom.metrics?.remove();
    if (this.dom.warningsCreated) this.dom.warnings?.remove();
    APP_INSTANCES.delete(this.dom.root);
  }
}

export function createCssMinifierApp(root) {
  if (!root) return null;
  if (APP_INSTANCES.has(root)) return APP_INSTANCES.get(root);

  const app = new CssMinifierApp(root);
  APP_INSTANCES.set(root, app);
  return app;
}
