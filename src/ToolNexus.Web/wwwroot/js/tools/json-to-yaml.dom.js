export function getJsonToYamlDom(root) {
  if (!root) return null;

  return {
    root,
    jsonInput: root.querySelector('#jsonInput'),
    yamlOutput: root.querySelector('#yamlOutput'),
    convertBtn: root.querySelector('#convertBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    copyBtn: root.querySelector('#copyBtn'),
    downloadBtn: root.querySelector('#downloadBtn'),
    autoConvert: root.querySelector('#autoConvertToggle'),
    indentSelect: root.querySelector('#indentSelect'),
    compactToggle: root.querySelector('#compactToggle'),
    quoteAllToggle: root.querySelector('#quoteAllToggle'),
    sortKeysToggle: root.querySelector('#sortKeysToggle'),
    multilineToggle: root.querySelector('#multilineToggle'),
    multilineStyle: root.querySelector('#multilineStyle'),
    prettyToggle: root.querySelector('#prettyToggle'),
    statusText: root.querySelector('#statusText'),
    sizeText: root.querySelector('#sizeText'),
    errorBox: root.querySelector('#errorBox'),
    errorTitle: root.querySelector('#errorTitle'),
    errorDetail: root.querySelector('#errorDetail')
  };
}
