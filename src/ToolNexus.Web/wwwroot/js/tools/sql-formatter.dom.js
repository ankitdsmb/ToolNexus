const SELECTORS = Object.freeze({
  page: '.tool-page[data-slug="sql-formatter"]',
  input: '#inputEditor',
  output: '#outputEditor',
  runButton: '#runBtn',
  clearButton: '#clearBtn',
  copyButton: '#copyBtn',
  downloadButton: '#downloadBtn',
  actionSelect: '#actionSelect',
  resultStatus: '#resultStatus'
});

export function getSqlFormatterDom(root) {
  if (!root?.matches?.(SELECTORS.page)) {
    return null;
  }

  return {
    root,
    input: root.querySelector(SELECTORS.input),
    output: root.querySelector(SELECTORS.output),
    runButton: root.querySelector(SELECTORS.runButton),
    clearButton: root.querySelector(SELECTORS.clearButton),
    copyButton: root.querySelector(SELECTORS.copyButton),
    downloadButton: root.querySelector(SELECTORS.downloadButton),
    actionSelect: root.querySelector(SELECTORS.actionSelect),
    resultStatus: root.querySelector(SELECTORS.resultStatus)
  };
}
