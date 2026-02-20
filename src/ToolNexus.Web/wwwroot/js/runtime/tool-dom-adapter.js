import { TOOL_DOM_CONTRACT } from './tool-dom-contract.js';
import { validateToolDom } from './tool-dom-contract-validator.js';

function normalizeRoot(root) {
  if (root?.nodeType === Node.ELEMENT_NODE || root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root;
  }

  return null;
}

function getAliasNode(scope, nodeName) {
  const aliases = TOOL_DOM_CONTRACT.legacyAliases[nodeName] ?? [];
  for (const selector of aliases) {
    const node = scope.querySelector(selector);
    if (node) {
      return node;
    }
  }

  return null;
}

function assignNodeAttribute(node, nodeName) {
  if (!node || node.hasAttribute(nodeName)) {
    return;
  }

  node.setAttribute(nodeName, 'true');
}

function createNode(tagName, nodeName) {
  const node = document.createElement(tagName);
  node.setAttribute(nodeName, 'true');
  node.dataset.adapterInjected = 'true';
  return node;
}

export function adaptToolDom(root, capability = {}) {
  const scope = normalizeRoot(root);
  if (!scope) {
    return {
      adapted: false,
      detectedLayoutType: 'UNKNOWN_LAYOUT',
      missingNodes: [...TOOL_DOM_CONTRACT.requiredNodes],
      createdNodes: [],
      adaptedNodes: []
    };
  }

  const before = validateToolDom(scope);
  if (before.isValid) {
    return {
      adapted: false,
      detectedLayoutType: before.detectedLayoutType,
      missingNodes: [],
      createdNodes: [],
      adaptedNodes: []
    };
  }

  const createdNodes = [];
  const adaptedNodes = [];

  const toolRoot = scope.querySelector('[data-tool-root]')
    ?? getAliasNode(scope, 'data-tool-root')
    ?? scope.firstElementChild
    ?? (() => {
      const node = createNode('section', 'data-tool-root');
      scope.appendChild(node);
      createdNodes.push('data-tool-root');
      return node;
    })();

  assignNodeAttribute(toolRoot, 'data-tool-root');
  adaptedNodes.push('data-tool-root');

  const body = scope.querySelector('[data-tool-body]')
    ?? getAliasNode(scope, 'data-tool-body')
    ?? (() => {
      const node = createNode('section', 'data-tool-body');
      toolRoot.appendChild(node);
      createdNodes.push('data-tool-body');
      return node;
    })();

  assignNodeAttribute(body, 'data-tool-body');
  adaptedNodes.push('data-tool-body');

  const header = scope.querySelector('[data-tool-header]')
    ?? getAliasNode(scope, 'data-tool-header')
    ?? (() => {
      const node = createNode('header', 'data-tool-header');
      toolRoot.prepend(node);
      createdNodes.push('data-tool-header');
      return node;
    })();

  assignNodeAttribute(header, 'data-tool-header');
  adaptedNodes.push('data-tool-header');

  const input = scope.querySelector('[data-tool-input]')
    ?? getAliasNode(scope, 'data-tool-input')
    ?? (() => {
      const node = createNode('section', 'data-tool-input');
      body.appendChild(node);
      createdNodes.push('data-tool-input');
      return node;
    })();

  assignNodeAttribute(input, 'data-tool-input');
  adaptedNodes.push('data-tool-input');

  const output = scope.querySelector('[data-tool-output]')
    ?? getAliasNode(scope, 'data-tool-output')
    ?? (() => {
      const node = createNode('section', 'data-tool-output');
      body.appendChild(node);
      createdNodes.push('data-tool-output');
      return node;
    })();

  assignNodeAttribute(output, 'data-tool-output');
  adaptedNodes.push('data-tool-output');

  const actions = scope.querySelector('[data-tool-actions]')
    ?? getAliasNode(scope, 'data-tool-actions')
    ?? (() => {
      const node = createNode('div', 'data-tool-actions');
      body.appendChild(node);
      createdNodes.push('data-tool-actions');
      return node;
    })();

  assignNodeAttribute(actions, 'data-tool-actions');
  adaptedNodes.push('data-tool-actions');

  const after = validateToolDom(scope);

  return {
    adapted: true,
    detectedLayoutType: before.detectedLayoutType,
    missingNodes: after.missingNodes,
    createdNodes,
    adaptedNodes,
    capability
  };
}
