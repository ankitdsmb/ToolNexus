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

function renderMetrics(target, payload) {
  const totalCss = readMetric(payload, ['totalCss', 'total_css', 'totalCSS', 'total']);
  const usedCss = readMetric(payload, ['usedCss', 'used_css', 'usedCSS', 'used']);
  const unusedCss = readMetric(payload, ['unusedCss', 'unused_css', 'unusedCSS', 'unused']);
  const efficiencyScore = readMetric(payload, ['efficiencyScore', 'efficiency_score', 'score']);
  const frameworkDetected = readMetric(payload, ['frameworkDetected', 'framework_detected', 'framework']);

  target.innerHTML = `
    <section class="tool-result-panel" aria-live="polite">
      <h3>Analysis Results</h3>
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
      <button type="button" id="unused-css-analyze">Analyze</button>
    </section>
  `;

  outputZone.innerHTML = '<p>Enter a URL and run analysis.</p>';

  const urlInput = inputZone.querySelector('#unused-css-url');
  const analyzeButton = inputZone.querySelector('#unused-css-analyze');

  if (!(urlInput instanceof HTMLInputElement) || !(analyzeButton instanceof HTMLButtonElement)) {
    throw new Error('[unused-css-finder] Failed to initialize controls.');
  }

  const onAnalyze = async () => {
    const url = urlInput.value.trim();
    if (!url) {
      outputZone.innerHTML = '<p>Please enter a valid URL.</p>';
      return;
    }

    analyzeButton.disabled = true;
    outputZone.innerHTML = '<p>Analyzing CSS usage…</p>';

    try {
      const response = await fetch('/api/tools/css-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      renderMetrics(outputZone, payload);
    } catch (error) {
      outputZone.innerHTML = `<p>Analysis failed: ${escapeHtml(error?.message ?? 'Unknown error')}</p>`;
    } finally {
      analyzeButton.disabled = false;
    }
  };

  analyzeButton.addEventListener('click', onAnalyze);
  const onUrlKeydown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAnalyze();
    }
  };

  urlInput.addEventListener('keydown', onUrlKeydown);

  return {
    destroy() {
      analyzeButton.removeEventListener('click', onAnalyze);
      urlInput.removeEventListener('keydown', onUrlKeydown);
    }
  };
}
