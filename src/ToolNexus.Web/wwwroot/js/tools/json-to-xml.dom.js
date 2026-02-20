const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="json-to-xml"]',
  headingText: '.tool-page__heading p',
  headingWrap: '.tool-page__heading > div',
  toolbar: '.tool-toolbar__actions',
  actionSelector: '.tool-page__action-selector',
  input: '#inputEditor',
  runButton: '#runBtn',
  runButtonLabel: '#runBtn .tool-btn__label',
  shortcutHint: '#editorShortcutHint',
  resultStatus: '#resultStatus',
  errorMessage: '#errorMessage'
});

function createControls() {
  const controls = document.createElement('section');
  controls.className = 'json-xml-controls';
  controls.innerHTML = `
    <label class="json-xml-controls__field"><span>Root element</span><input id="jsonXmlRootName" type="text" value="root" /></label>
    <label class="json-xml-controls__field"><span>Pretty print</span><input id="jsonXmlPrettyPrint" type="checkbox" checked /></label>
    <label class="json-xml-controls__field"><span>Indentation</span><select id="jsonXmlIndentSize"><option value="2">2 spaces</option><option value="4">4 spaces</option></select></label>
    <label class="json-xml-controls__field"><span>Auto root wrapper</span><input id="jsonXmlAutoRoot" type="checkbox" checked /></label>
    <label class="json-xml-controls__field"><span>Primitive to attributes</span><input id="jsonXmlAttributeMode" type="checkbox" /></label>
    <label class="json-xml-controls__field"><span>Null handling</span><select id="jsonXmlNullMode"><option value="self-closing">Self-closing tag</option><option value="empty">Empty element pair</option></select></label>
    <label class="json-xml-controls__field"><span>Auto convert</span><input id="jsonXmlAutoConvert" type="checkbox" /></label>
  `;

  return controls;
}

export function getJsonToXmlDom(root) {
  if (!root?.matches?.(SELECTORS.page)) return null;

  let badge = root.querySelector('.json-xml-badge');
  let badgeCreated = false;
  const headingWrap = root.querySelector(SELECTORS.headingWrap);
  if (!badge && headingWrap) {
    badge = document.createElement('span');
    badge.textContent = 'Client-side processing';
    badge.className = 'json-xml-badge';
    headingWrap.appendChild(badge);
    badgeCreated = true;
  }

  let clearButton = root.querySelector('#jsonXmlClearBtn');
  let clearButtonCreated = false;
  const toolbar = root.querySelector(SELECTORS.toolbar);
  if (!clearButton && toolbar) {
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.id = 'jsonXmlClearBtn';
    clearButton.className = 'tool-btn tool-btn--outline';
    clearButton.textContent = 'Clear input';
    toolbar.insertBefore(clearButton, toolbar.firstChild?.nextSibling ?? null);
    clearButtonCreated = true;
  }

  let controls = root.querySelector('.json-xml-controls');
  let controlsCreated = false;
  const actionSelector = root.querySelector(SELECTORS.actionSelector);
  if (!controls && actionSelector?.parentElement) {
    controls = createControls();
    actionSelector.parentElement.insertBefore(controls, actionSelector.nextSibling);
    controlsCreated = true;
  }

  return {
    root,
    headingText: root.querySelector(SELECTORS.headingText),
    runButton: root.querySelector(SELECTORS.runButton),
    runButtonLabel: root.querySelector(SELECTORS.runButtonLabel),
    shortcutHint: root.querySelector(SELECTORS.shortcutHint),
    input: root.querySelector(SELECTORS.input),
    resultStatus: root.querySelector(SELECTORS.resultStatus),
    errorMessage: root.querySelector(SELECTORS.errorMessage),
    autoConvert: root.querySelector('#jsonXmlAutoConvert'),
    rootName: root.querySelector('#jsonXmlRootName'),
    prettyPrint: root.querySelector('#jsonXmlPrettyPrint'),
    indentSize: root.querySelector('#jsonXmlIndentSize'),
    autoRoot: root.querySelector('#jsonXmlAutoRoot'),
    attributeMode: root.querySelector('#jsonXmlAttributeMode'),
    nullMode: root.querySelector('#jsonXmlNullMode'),
    controls,
    controlsCreated,
    clearButton,
    clearButtonCreated,
    badge,
    badgeCreated
  };
}
