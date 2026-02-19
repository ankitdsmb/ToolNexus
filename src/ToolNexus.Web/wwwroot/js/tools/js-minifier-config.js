export const JS_MINIFIER_CONFIG = Object.freeze({
  selectors: {
    page: '.tool-page[data-slug="js-minifier"]'
  },
  ids: {
    actionSelect: 'actionSelect',
    heading: 'toolOutputHeading',
    runBtn: 'runBtn',
    copyBtn: 'copyBtn',
    downloadBtn: 'downloadBtn',
    shareBtn: 'shareBtn',
    shortcutHint: 'editorShortcutHint',
    inputEditor: 'inputEditor',
    outputEditor: 'outputEditor',
    outputStatus: 'resultStatus',
    errorMessage: 'errorMessage',
    outputEmptyState: 'outputEmptyState',
    outputField: 'outputField'
  },
  classes: {
    options: 'js-minifier-options',
    metrics: 'js-minifier-metrics',
    processing: 'js-minifier-processing',
    badge: 'js-minifier-badge'
  },
  fileName: 'output.min.js',
  debounceMs: 280,
  largeFileThresholdBytes: 1024 * 256,
  processingUiYieldBytes: 1024 * 64,
  scriptId: 'toolnexus-terser-bundle',
  scriptSrc: '/js/vendor/terser.bundle.min.js'
});

export const COMPRESSION_MODES = Object.freeze({
  basic: 'basic',
  aggressive: 'aggressive'
});
