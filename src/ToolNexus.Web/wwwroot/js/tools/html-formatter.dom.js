const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="html-formatter"]',
  input: '#inputEditor',
  output: '#outputEditor',
  runButton: '#runBtn',
  copyButton: '#copyBtn',
  downloadButton: '#downloadBtn',
  actionSelect: '#actionSelect',
  errorMessage: '#errorMessage',
  resultStatus: '#resultStatus',
  toolbar: '.tool-toolbar__actions',
  shortcutHint: '#editorShortcutHint'
});

export function getHtmlFormatterDom(root) {
  if (!root?.matches?.(SELECTORS.page)) return null;

  const toolbar = root.querySelector(SELECTORS.toolbar);
  let clearButton = root.querySelector('[data-html-action="clear"]');
  let clearButtonCreated = false;
  if (!clearButton && toolbar) {
    clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'tool-btn tool-btn--outline';
    clearButton.dataset.htmlAction = 'clear';
    clearButton.textContent = 'Clear input';
    toolbar.appendChild(clearButton);
    clearButtonCreated = true;
  }

  return {
    root,
    input: root.querySelector(SELECTORS.input),
    output: root.querySelector(SELECTORS.output),
    runButton: root.querySelector(SELECTORS.runButton),
    copyButton: root.querySelector(SELECTORS.copyButton),
    downloadButton: root.querySelector(SELECTORS.downloadButton),
    actionSelect: root.querySelector(SELECTORS.actionSelect),
    errorMessage: root.querySelector(SELECTORS.errorMessage),
    resultStatus: root.querySelector(SELECTORS.resultStatus),
    shortcutHint: root.querySelector(SELECTORS.shortcutHint),
    clearButton,
    clearButtonCreated
  };
}
