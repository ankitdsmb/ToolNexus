import { JSON_FORMATTER_CONFIG } from './json-formatter/constants.js';

const ELEMENT_IDS = [
  'formatBtn', 'minifyBtn', 'validateBtn', 'clearBtn', 'copyBtn', 'downloadBtn',
  'indentSizeSelect', 'sortKeysToggle', 'autoFormatToggle', 'wrapToggle',
  'jsonEditor', 'outputEditor', 'resultStatus', 'validationState', 'perfTime',
  'payloadStats', 'outputStats', 'processingIndicator', 'errorBox', 'errorTitle',
  'errorDetail', 'errorLocation', 'toastRegion'
];

export function resolveJsonFormatterDom(root) {
  return ELEMENT_IDS.reduce((accumulator, id) => {
    accumulator[id] = root.querySelector(`#${id}`);
    return accumulator;
  }, {});
}

export function setErrorState(dom, error) {
  dom.errorTitle.textContent = error.title;
  dom.errorDetail.textContent = `${error.message} ${error.details ?? ''}`.trim();

  if (error.location) {
    dom.errorLocation.hidden = false;
    dom.errorLocation.textContent = `Line ${error.location.line}, Column ${error.location.column}`;
  } else {
    dom.errorLocation.hidden = true;
    dom.errorLocation.textContent = '';
  }

  dom.errorBox.hidden = false;
}

export function clearErrorState(dom) {
  dom.errorBox.hidden = true;
  dom.errorTitle.textContent = '';
  dom.errorDetail.textContent = '';
  dom.errorLocation.textContent = '';
  dom.errorLocation.hidden = true;
}

export function pushToast(dom, message, variant = 'success') {
  while (dom.toastRegion.children.length >= JSON_FORMATTER_CONFIG.maxToasts) {
    dom.toastRegion.firstChild?.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.textContent = message;
  dom.toastRegion.appendChild(toast);

  window.setTimeout(() => toast.remove(), JSON_FORMATTER_CONFIG.toastDurationMs);
}
