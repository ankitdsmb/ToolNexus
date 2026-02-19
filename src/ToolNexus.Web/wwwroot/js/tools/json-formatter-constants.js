export const JSON_FORMATTER_CONFIG = {
  markerOwner: 'json-formatter-validation',
  debounceMs: 250,
  largePayloadBytes: 1024 * 1024,
  maxImportBytes: 10 * 1024 * 1024,
  maxToasts: 3,
  slowOperationMs: 100,
  parseTimeoutMs: 5000,
  outputFilenamePrefix: 'toolnexus-json',
  statusResetMs: 2200
};

export const ACTIONS = {
  format: 'format',
  minify: 'minify',
  validate: 'validate',
  sort: 'sort',
  escape: 'escape',
  unescape: 'unescape',
  autofix: 'autofix'
};
