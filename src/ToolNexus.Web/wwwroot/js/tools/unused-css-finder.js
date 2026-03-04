function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readMetric(source, keys, fallback = '—') {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
      return source[key];
    }
  }
  return fallback;
}

function renderAnalysisResult(target, payload) {
  const totalCss = readMetric(payload, ['totalCss', 'total_css', 'totalCSS', 'total']);
  const usedCss = readMetric(payload, ['usedCss', 'used_css', 'usedCSS', 'used']);
  const unusedCss = readMetric(payload, ['unusedCss', 'unused_css', 'unusedCSS', 'unused']);
  const efficiencyScore = readMetric(payload, ['efficiencyScore', 'efficiency_score', 'score']);
  const frameworkDetected = readMetric(payload, ['frameworkDetected', 'framework_detected', 'framework']);

  target.innerHTML = `
    <section class="tool-result-panel" aria-live="polite">
      <h3>Results Dashboard</h3>
      <dl>
        <div><dt>Total CSS</dt><dd>${escapeHtml(totalCss)}</dd></div>
        <div><dt>Used CSS</dt><dd>${escapeHtml(usedCss)}</dd></div>
        <div><dt>Unused CSS</dt><dd>${escapeHtml(unusedCss)}</dd></div>
        <div><dt>Efficiency Score</dt><dd>${escapeHtml(efficiencyScore)}</dd></div>
        <div><dt>Framework Detected</dt><dd>${escapeHtml(frameworkDetected)}</dd></div>
      </dl>
    </section>
  `;
}

function renderComparisonResult(target, payload) {
  const betterSite = readMetric(payload, ['betterSite']);
  const difference = readMetric(payload, ['efficiencyDifference', 'differenceScore']);

  target.innerHTML = `
    <section class="tool-result-panel" aria-live="polite">
      <h3>Comparison Dashboard</h3>
      <p><strong>Better Site:</strong> ${escapeHtml(betterSite)}</p>
      <p><strong>Efficiency Difference:</strong> ${escapeHtml(difference)}</p>
      <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
    </section>
  `;
}

function setLoading(target, isLoading, message = 'Analyzing CSS usage…') {
  target.innerHTML = isLoading
    ? `<p data-loading-indicator="true">${escapeHtml(message)}</p>`
    : target.innerHTML;
}

export async function mount({ root }) {
  const inputZone = root?.querySelector?.('[data-tool-input]');
  const outputZone = root?.querySelector?.('[data-tool-output]');

  if (!(inputZone instanceof Element) || !(outputZone instanceof Element)) {
    throw new Error('[unused-css-finder] Tool shell is missing required input/output zones.');
  }

  inputZone.innerHTML = `
    <section class="tool-panel">
      <label for="unused-css-url">Page URL</label>
      <input id="unused-css-url" type="url" placeholder="https://example.com" autocomplete="off" />

      <label for="unused-css-competitor">Competitor URL (optional)</label>
      <input id="unused-css-competitor" type="url" placeholder="https://competitor.com" autocomplete="off" />

      <div class="tool-actions">
        <button type="button" id="unused-css-analyze">Analyze</button>
        <button type="button" id="unused-css-compare">Compare</button>
        <button type="button" id="unused-css-critical">Download Critical CSS</button>
      </div>
    </section>
  `;

  outputZone.innerHTML = '<p>Enter a URL and run analysis.</p>';

  const urlInput = inputZone.querySelector('#unused-css-url');
  const competitorInput = inputZone.querySelector('#unused-css-competitor');
  const analyzeButton = inputZone.querySelector('#unused-css-analyze');
  const compareButton = inputZone.querySelector('#unused-css-compare');
  const criticalButton = inputZone.querySelector('#unused-css-critical');

  if (!(urlInput instanceof HTMLInputElement)
      || !(competitorInput instanceof HTMLInputElement)
      || !(analyzeButton instanceof HTMLButtonElement)
      || !(compareButton instanceof HTMLButtonElement)
      || !(criticalButton instanceof HTMLButtonElement)) {
    throw new Error('[unused-css-finder] Failed to initialize controls.');
  }

  const setBusy = (busy) => {
    analyzeButton.disabled = busy;
    compareButton.disabled = busy;
    criticalButton.disabled = busy;
  };

  const onAnalyze = async () => {
    const url = urlInput.value.trim();
    if (!url) {
      outputZone.innerHTML = '<p>Please enter a valid URL.</p>';
      return;
    }

    setBusy(true);
    setLoading(outputZone, true, 'Analyzing CSS usage…');

    try {
      const response = await fetch('/api/tools/css-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      renderAnalysisResult(outputZone, await response.json());
    } catch (error) {
      outputZone.innerHTML = `<p>Analysis failed: ${escapeHtml(error?.message ?? 'Unknown error')}</p>`;
    } finally {
      setBusy(false);
    }
  };

  const onCompare = async () => {
    const urlA = urlInput.value.trim();
    const urlB = competitorInput.value.trim();

    if (!urlA || !urlB) {
      outputZone.innerHTML = '<p>Please enter both URLs for comparison.</p>';
      return;
    }

    setBusy(true);
    setLoading(outputZone, true, 'Comparing CSS efficiency…');

    try {
      const response = await fetch('/api/tools/css-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlA, urlB })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      renderComparisonResult(outputZone, await response.json());
    } catch (error) {
      outputZone.innerHTML = `<p>Comparison failed: ${escapeHtml(error?.message ?? 'Unknown error')}</p>`;
    } finally {
      setBusy(false);
    }
  };

  const onDownloadCritical = async () => {
    const url = urlInput.value.trim();
    if (!url) {
      outputZone.innerHTML = '<p>Please enter a valid URL.</p>';
      return;
    }

    setBusy(true);
    setLoading(outputZone, true, 'Generating critical CSS…');

    try {
      const response = await fetch('/api/tools/critical-css', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const cssBlob = await response.blob();
      const blobUrl = URL.createObjectURL(cssBlob);
      const download = document.createElement('a');
      download.href = blobUrl;
      download.download = 'critical.css';
      download.click();
      URL.revokeObjectURL(blobUrl);

      outputZone.innerHTML = '<p>Critical CSS generated and download started.</p>';
    } catch (error) {
      outputZone.innerHTML = `<p>Critical CSS generation failed: ${escapeHtml(error?.message ?? 'Unknown error')}</p>`;
    } finally {
      setBusy(false);
    }
  };

  analyzeButton.addEventListener('click', onAnalyze);
  compareButton.addEventListener('click', onCompare);
  criticalButton.addEventListener('click', onDownloadCritical);

  const onUrlKeydown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAnalyze();
    }
  };

  const onCompetitorKeydown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCompare();
    }
  };

  urlInput.addEventListener('keydown', onUrlKeydown);
  competitorInput.addEventListener('keydown', onCompetitorKeydown);

  return {
    destroy() {
      analyzeButton.removeEventListener('click', onAnalyze);
      compareButton.removeEventListener('click', onCompare);
      criticalButton.removeEventListener('click', onDownloadCritical);
      urlInput.removeEventListener('keydown', onUrlKeydown);
      competitorInput.removeEventListener('keydown', onCompetitorKeydown);
    }
  };
}
