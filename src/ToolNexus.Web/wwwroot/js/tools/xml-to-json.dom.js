const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="xml-to-json"]',
  runButton: '#runBtn',
  input: '#inputEditor',
  actionSelector: '.tool-page__action-selector',
  toolbar: '.tool-toolbar__actions',
  headingDescription: '.tool-page__heading p',
  headingWrapper: '.tool-page__heading > div',
  shortcutHint: '#editorShortcutHint'
});

export function getXmlToJsonDom(root) {
  if (!root?.matches?.(SELECTORS.page)) {
    return null;
  }

  let clearButton = root.querySelector('#xmlJsonClearBtn');
  let clearButtonCreated = false;
  const toolbar = root.querySelector(SELECTORS.toolbar);
  if (!clearButton && toolbar) {
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.id = 'xmlJsonClearBtn';
    clearButton.className = 'tool-btn tool-btn--outline';
    clearButton.textContent = 'Clear input';
    toolbar.insertBefore(clearButton, toolbar.children[1] ?? null);
    clearButtonCreated = true;
  }

  let controls = root.querySelector('.xml-json-controls');
  let controlsCreated = false;
  const actionSelector = root.querySelector(SELECTORS.actionSelector);
  if (!controls && actionSelector?.parentElement) {
    controls = document.createElement('section');
    controls.className = 'xml-json-controls';
    controls.innerHTML = `
      <label class="xml-json-controls__field"><span>Value mode</span>
        <select id="xmlJsonValueMode">
          <option value="strings" selected>Keep strings (safe)</option>
          <option value="detect">Auto detect types</option>
          <option value="raw">Preserve raw text</option>
        </select>
      </label>
      <label class="xml-json-controls__field"><span>Output</span>
        <select id="xmlJsonOutputMode">
          <option value="pretty" selected>Pretty JSON</option>
          <option value="minified">Minified JSON</option>
        </select>
      </label>
      <label class="xml-json-controls__field"><span>Indentation</span>
        <select id="xmlJsonIndentSize"><option value="2" selected>2 spaces</option><option value="4">4 spaces</option></select>
      </label>
      <label class="xml-json-controls__field"><span>Attribute key</span><input id="xmlJsonAttributeKey" type="text" value="@attributes" /></label>
      <label class="xml-json-controls__field"><span>Text key</span><input id="xmlJsonTextKey" type="text" value="#text" /></label>
      <label class="xml-json-controls__field"><span>CDATA key</span><input id="xmlJsonCdataKey" type="text" value="#cdata" /></label>
      <label class="xml-json-controls__field"><span>Comment key</span><input id="xmlJsonCommentKey" type="text" value="#comment" /></label>
      <label class="xml-json-controls__field xml-json-controls__field--inline"><input id="xmlJsonIncludeAttributes" type="checkbox" checked /><span>Include attributes</span></label>
      <label class="xml-json-controls__field xml-json-controls__field--inline"><input id="xmlJsonSortKeys" type="checkbox" /><span>Sort keys</span></label>
      <label class="xml-json-controls__field xml-json-controls__field--inline"><input id="xmlJsonAutoConvert" type="checkbox" /><span>Auto convert</span></label>
      <p id="xmlJsonMetrics" class="xml-json-controls__metrics" role="status" aria-live="polite">Ready.</p>
    `;
    actionSelector.parentElement.insertBefore(controls, actionSelector.nextSibling);
    controlsCreated = true;
  }

  let badge = root.querySelector('.xml-json-tool__badge');
  let badgeCreated = false;
  const headingWrapper = root.querySelector(SELECTORS.headingWrapper);
  if (!badge && headingWrapper) {
    badge = document.createElement('span');
    badge.className = 'xml-json-tool__badge';
    badge.textContent = 'Client-side processing';
    headingWrapper.appendChild(badge);
    badgeCreated = true;
  }

  return {
    root,
    input: root.querySelector(SELECTORS.input),
    runButton: root.querySelector(SELECTORS.runButton),
    clearButton,
    controls,
    toolbar,
    description: root.querySelector(SELECTORS.headingDescription),
    shortcutHint: root.querySelector(SELECTORS.shortcutHint),
    controlsCreated,
    clearButtonCreated,
    badge,
    badgeCreated,
    metrics: root.querySelector('#xmlJsonMetrics'),
    autoConvert: root.querySelector('#xmlJsonAutoConvert')
  };
}
