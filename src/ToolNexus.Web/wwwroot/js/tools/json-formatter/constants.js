export const FORMAT_MODE = Object.freeze({
  PRETTY: 'pretty',
  MINIFIED: 'minified',
  VALIDATE: 'validate'
});

export const JSON_FORMATTER_CONFIG = Object.freeze({
  markerOwner: 'json-formatter-validation',
  maxToasts: 3,
  toastDurationMs: 2200,
  inputDebounceMs: 250,
  slowPayloadChars: 180000,
  autoFormatDebounceMs: 550,
  monacoTheme: 'vs-dark'
});
