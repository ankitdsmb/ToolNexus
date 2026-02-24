import { LAYOUT_TYPES, TOOL_DOM_CONTRACT } from './tool-dom-contract.js';

function normalizeRoot(root) {
  if (root?.nodeType === Node.ELEMENT_NODE || root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root;
  }

  return null;
}

function hasSelector(scope, selector) {
  if (!scope || !selector) {
    return false;
  }

  return Boolean(scope.matches?.(selector) || scope.querySelector?.(selector));
}

function hasNode(scope, nodeName) {
  const selector = TOOL_DOM_CONTRACT.nodeSelectors[nodeName];
  if (!selector) {
    return false;
  }

  if (nodeName === 'data-runtime-container') {
    return hasSelector(scope, selector) || Boolean(scope.closest?.(selector));
  }

  return hasSelector(scope, selector);
}

function detectLayoutType(scope) {
  if (!scope) {
    return LAYOUT_TYPES.UNKNOWN_LAYOUT;
  }

  const hasCanonicalNodes = TOOL_DOM_CONTRACT.requiredNodes.every((nodeName) => hasNode(scope, nodeName));

  if (hasCanonicalNodes) {
    return LAYOUT_TYPES.MODERN_LAYOUT;
  }

  const hasLegacyStructure = hasSelector(scope, '.tool-page')
    || hasSelector(scope, '.tool-layout')
    || hasSelector(scope, '.tool-controls')
    || hasSelector(scope, '.tool-result')
    || hasSelector(scope, '#inputEditor')
    || hasSelector(scope, '#outputField');

  if (hasLegacyStructure) {
    return LAYOUT_TYPES.LEGACY_LAYOUT;
  }

  const hasMinimalStructure = hasSelector(scope, 'textarea')
    || hasSelector(scope, 'input')
    || hasSelector(scope, 'pre')
    || hasSelector(scope, 'output');

  if (hasMinimalStructure) {
    return LAYOUT_TYPES.MINIMAL_LAYOUT;
  }

  return LAYOUT_TYPES.UNKNOWN_LAYOUT;
}

export function validateToolDom(root) {
  const scope = normalizeRoot(root);
  if (!scope) {
    return {
      isValid: false,
      missingNodes: [...TOOL_DOM_CONTRACT.requiredNodes],
      detectedLayoutType: LAYOUT_TYPES.UNKNOWN_LAYOUT,
      mountSafe: false
    };
  }

  const missingNodes = TOOL_DOM_CONTRACT.requiredNodes.filter((nodeName) => !hasNode(scope, nodeName));

  return {
    isValid: missingNodes.length === 0,
    missingNodes,
    detectedLayoutType: detectLayoutType(scope),
    mountSafe: Boolean(scope)
  };
}

export function validateToolDomContract(root, slug = '') {
  const report = validateToolDom(root);

  return {
    valid: report.isValid,
    errors: report.isValid
      ? []
      : ['[DOM CONTRACT ERROR]', ...report.missingNodes.map((nodeName) => `Missing node: ${nodeName}`)]
  };
}
