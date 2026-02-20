export function getBase64EncodeDom(root) {
  if (!root) {
    return null;
  }

  return {
    root,
    textModeBtn: root.querySelector('#textModeBtn'),
    fileModeBtn: root.querySelector('#fileModeBtn'),
    dropZone: root.querySelector('#dropZone'),
    fileInput: root.querySelector('#fileInput'),
    inputEditor: root.querySelector('#inputEditor'),
    outputEditor: root.querySelector('#outputEditor'),
    urlSafeToggle: root.querySelector('#urlSafeToggle'),
    removePaddingToggle: root.querySelector('#removePaddingToggle'),
    autoEncodeToggle: root.querySelector('#autoEncodeToggle'),
    encodeBtn: root.querySelector('#encodeBtn'),
    clearBtn: root.querySelector('#clearBtn'),
    copyBtn: root.querySelector('#copyBtn'),
    downloadBtn: root.querySelector('#downloadBtn'),
    loadingState: root.querySelector('#loadingState'),
    warningBanner: root.querySelector('#warningBanner'),
    errorBox: root.querySelector('#errorBox'),
    errorTitle: root.querySelector('#errorTitle'),
    errorMessage: root.querySelector('#errorMessage'),
    errorAction: root.querySelector('#errorAction'),
    statusText: root.querySelector('#statusText'),
    inputMeta: root.querySelector('#inputMeta')
  };
}
