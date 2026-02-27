import { TOOL_DOM_CONTRACT } from './tool-dom-contract.js';
import { validateToolDom } from './tool-dom-contract-validator.js';

function normalizeRoot(root) {
  if (root?.nodeType === Node.ELEMENT_NODE || root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root;
  }

  return null;
}

function findLegacyMatches(scope) {
  const mappedNodes = [];

  for (const nodeName of TOOL_DOM_CONTRACT.requiredNodes) {
    const aliases = TOOL_DOM_CONTRACT.legacyAliases[nodeName] ?? [];
    const hasAlias = aliases.some((selector) => Boolean(scope.matches?.(selector) || scope.querySelector?.(selector)));
    if (hasAlias) {
      mappedNodes.push(nodeName);
    }
  }

  return mappedNodes;
}

export function adaptToolDom(root, capability = {}) {
  const scope = normalizeRoot(root);
  if (!scope) {
    return {
      adapted: false,
      detectedLayoutType: 'UNKNOWN_LAYOUT',
      missingNodes: [...TOOL_DOM_CONTRACT.requiredNodes],
      createdNodes: [],
      adaptedNodes: [],
      legacyMappedNodes: [],
      contractViolation: true,
      capability
    };
  }

  const report = validateToolDom(scope);
  const legacyMappedNodes = findLegacyMatches(scope);

  return {
    adapted: false,
    detectedLayoutType: report.detectedLayoutType,
    missingNodes: report.missingNodes,
    createdNodes: [],
    adaptedNodes: [],
    legacyMappedNodes,
    contractViolation: !report.isValid,
    capability
  };
}
