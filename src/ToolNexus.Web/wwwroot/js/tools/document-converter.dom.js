export function queryDocumentConverterDom(root) {
  return {
    fileInput: root.querySelector('#fileInput'),
    conversionMode: root.querySelector('#conversionMode'),
    convertBtn: root.querySelector('#convertBtn'),
    conversionStatus: root.querySelector('#conversionStatus'),
    downloadLink: root.querySelector('#downloadLink'),
    executionTime: root.querySelector('#executionTime'),
    fileSize: root.querySelector('#fileSize'),
    errorBox: root.querySelector('#errorBox')
  };
}
