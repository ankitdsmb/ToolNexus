const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="xml-formatter"]',
  input: '#inputEditor',
  output: '#outputEditor',
  runButton: '#runBtn',
  copyButton: '#copyBtn',
  downloadButton: '#downloadBtn',
  actionSelect: '#actionSelect',
  errorMessage: '#errorMessage',
  resultStatus: '#resultStatus',
  inputPanelHeader: '#toolInputHeading',
  actionContainer: '.tool-page__action-selector',
  toolbar: '.tool-toolbar__actions',
  shortcutHint: '#editorShortcutHint'
});

function createControlsTemplate() {
  const controls = document.createElement('div');
  controls.className = 'xml-formatter-controls';
  controls.innerHTML = `
    <div class="xml-formatter-controls__row">
      <label for="xmlIndentStyle">Indentation</label>
      <select id="xmlIndentStyle">
        <option value="spaces-2">2 spaces</option>
        <option value="spaces-4">4 spaces</option>
        <option value="tabs">Tabs</option>
      </select>
    </div>
    <div class="xml-formatter-controls__toggles">
      <label><input id="xmlPrettyToggle" type="checkbox" checked /> Pretty print</label>
      <label><input id="xmlCompactToggle" type="checkbox" /> Compact mode</label>
      <label><input id="xmlAutoToggle" type="checkbox" /> Auto format</label>
    </div>
    <button id="xmlClearInputBtn" type="button" class="tool-btn tool-btn--outline">Clear input</button>
    <p id="xmlStats" class="xml-formatter-controls__stats" aria-live="polite"></p>
    <p id="xmlLargeFileNotice" class="xml-formatter-controls__notice" hidden>
      Large XML detected. Formatting may take a moment.
    </p>
  `;

  return controls;
}

export function getXmlFormatterDom(root) {
  if (!root?.matches?.(SELECTORS.page)) {
    return null;
  }

  const input = root.querySelector(SELECTORS.input);
  const output = root.querySelector(SELECTORS.output);
  const runButton = root.querySelector(SELECTORS.runButton);
  const copyButton = root.querySelector(SELECTORS.copyButton);
  const downloadButton = root.querySelector(SELECTORS.downloadButton);
  const actionSelect = root.querySelector(SELECTORS.actionSelect);
  const errorMessage = root.querySelector(SELECTORS.errorMessage);
  const resultStatus = root.querySelector(SELECTORS.resultStatus);
  const inputPanelHeader = root.querySelector(SELECTORS.inputPanelHeader)?.parentElement;
  const actionContainer = root.querySelector(SELECTORS.actionContainer);
  const toolbar = root.querySelector(SELECTORS.toolbar);
  const shortcutHint = root.querySelector(SELECTORS.shortcutHint);

  let controls = root.querySelector('.xml-formatter-controls');
  let controlsCreated = false;

  if (!controls && actionContainer) {
    controls = createControlsTemplate();
    actionContainer.insertAdjacentElement('afterend', controls);
    controlsCreated = true;
  }

  let badge = inputPanelHeader?.querySelector('.xml-formatter-badge');
  let badgeCreated = false;
  if (!badge && inputPanelHeader) {
    badge = document.createElement('span');
    badge.className = 'xml-formatter-badge';
    badge.textContent = 'Client-side processing';
    inputPanelHeader.appendChild(badge);
    badgeCreated = true;
  }

  let toolbarNote = toolbar?.querySelector('.xml-toolbar-note');
  let toolbarNoteCreated = false;
  if (!toolbarNote && toolbar) {
    toolbarNote = document.createElement('span');
    toolbarNote.className = 'xml-toolbar-note';
    toolbarNote.textContent = 'Output is text-only (safe, no execution).';
    toolbar.appendChild(toolbarNote);
    toolbarNoteCreated = true;
  }

  return {
    root,
    input,
    output,
    runButton,
    copyButton,
    downloadButton,
    actionSelect,
    errorMessage,
    resultStatus,
    shortcutHint,
    controls,
    controlsCreated,
    badge,
    badgeCreated,
    toolbarNote,
    toolbarNoteCreated,
    indentStyle: controls?.querySelector('#xmlIndentStyle') ?? null,
    prettyToggle: controls?.querySelector('#xmlPrettyToggle') ?? null,
    compactToggle: controls?.querySelector('#xmlCompactToggle') ?? null,
    autoToggle: controls?.querySelector('#xmlAutoToggle') ?? null,
    clearButton: controls?.querySelector('#xmlClearInputBtn') ?? null,
    stats: controls?.querySelector('#xmlStats') ?? null,
    largeFileNotice: controls?.querySelector('#xmlLargeFileNotice') ?? null
  };
}
