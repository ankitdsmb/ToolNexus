export function getYamlToJsonDom(root) {
  if (!root) return null;

  return {
    root,
    yamlInput: root.querySelector('#yamlInput'),
    jsonOutput: root.querySelector('#jsonOutput'),
    convertBtn: root.querySelector('#convertBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    copyBtn: root.querySelector('#copyBtn'),
    downloadBtn: root.querySelector('#downloadBtn'),
    autoConvertToggle: root.querySelector('#autoConvertToggle'),
    prettyToggle: root.querySelector('#prettyToggle'),
    indentSelect: root.querySelector('#indentSelect'),
    sortKeysToggle: root.querySelector('#sortKeysToggle'),
    autoTypesToggle: root.querySelector('#autoTypesToggle'),
    strictStringsToggle: root.querySelector('#strictStringsToggle'),
    parseDatesToggle: root.querySelector('#parseDatesToggle'),
    statusText: root.querySelector('#statusText')
  };
}
