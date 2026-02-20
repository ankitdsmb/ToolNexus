const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="html-to-markdown"]',
  input: '#inputEditor',
  output: '#outputEditor',
  runButton: '#runBtn',
  copyButton: '#copyBtn',
  downloadButton: '#downloadBtn',
  resultStatus: '#resultStatus',
  actionSelector: '.tool-page__action-selector'
});

function createOptionsTemplate() {
  const wrapper = document.createElement('div');
  wrapper.id = 'htmlMdOptions';
  wrapper.className = 'html-md-options';
  wrapper.innerHTML = `
    <label class="html-md-options__toggle"><input type="checkbox" id="htmlMdAuto" /><span>Auto convert</span></label>
    <label class="html-md-options__toggle"><input type="checkbox" id="htmlMdFenced" checked /><span>Fenced code blocks</span></label>
    <label class="html-md-options__toggle"><input type="checkbox" id="htmlMdBreaks" checked /><span>Keep line breaks</span></label>
    <label class="html-md-options__toggle"><input type="checkbox" id="htmlMdPreserve" /><span>Preserve unsupported tags</span></label>
    <label class="html-md-options__toggle"><input type="checkbox" id="htmlMdTables" checked /><span>Convert tables</span></label>
    <label class="html-md-options__toggle"><input type="checkbox" id="htmlMdPre" checked /><span>Preserve <pre> blocks</span></label>
    <label class="html-md-options__select">Markdown density
      <select id="htmlMdDensity"><option value="pretty">Pretty</option><option value="compact">Compact</option></select>
    </label>
    <button id="htmlMdClearInput" class="tool-btn tool-btn--ghost" type="button">Clear input</button>
    <div id="htmlMdMetrics" class="html-md-metrics" aria-live="polite"></div>
  `;

  return wrapper;
}

export function getHtmlToMarkdownDom(root) {
  if (!root?.matches?.(SELECTORS.page)) return null;

  let options = root.querySelector('#htmlMdOptions');
  let optionsCreated = false;
  const actionZone = root.querySelector(SELECTORS.actionSelector);
  if (!options && actionZone) {
    options = createOptionsTemplate();
    actionZone.appendChild(options);
    optionsCreated = true;
  }

  return {
    root,
    input: root.querySelector(SELECTORS.input),
    output: root.querySelector(SELECTORS.output),
    runButton: root.querySelector(SELECTORS.runButton),
    copyButton: root.querySelector(SELECTORS.copyButton),
    downloadButton: root.querySelector(SELECTORS.downloadButton),
    resultStatus: root.querySelector(SELECTORS.resultStatus),
    options,
    optionsCreated
  };
}
