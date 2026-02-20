export function queryCsvToJsonDom(root) {
  return {
    root,
    convertBtn: root.querySelector('#convertBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    copyBtn: root.querySelector('#copyBtn'),
    downloadBtn: root.querySelector('#downloadBtn'),
    delimiterSelect: root.querySelector('#delimiterSelect'),
    useHeaderToggle: root.querySelector('#useHeaderToggle'),
    customHeadersField: root.querySelector('#customHeadersField'),
    customHeadersInput: root.querySelector('#customHeadersInput'),
    autoConvertToggle: root.querySelector('#autoConvertToggle'),
    prettyToggle: root.querySelector('#prettyToggle'),
    indentSelect: root.querySelector('#indentSelect'),
    typeDetectToggle: root.querySelector('#typeDetectToggle'),
    emptyAsNullToggle: root.querySelector('#emptyAsNullToggle'),
    sanitizeToggle: root.querySelector('#sanitizeToggle'),
    previewRowsInput: root.querySelector('#previewRowsInput'),
    statusText: root.querySelector('#statusText'),
    errorBox: root.querySelector('#errorBox'),
    csvInput: root.querySelector('#csvInput'),
    jsonOutput: root.querySelector('#jsonOutput'),
    rowCount: root.querySelector('#rowCount'),
    charCount: root.querySelector('#charCount')
  };
}
