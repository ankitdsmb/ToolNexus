import { TOOL_DOM_CONTRACT } from './tool-dom-contract.js';
import { validateToolDom } from './tool-dom-contract-validator.js';

function normalizeRoot(root) {
  if (root?.nodeType === Node.ELEMENT_NODE || root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root;
  }

  return null;
}

function findNode(scope, nodeName) {
  const selector = TOOL_DOM_CONTRACT.nodeSelectors[nodeName];
  if (scope?.matches?.(selector)) {
    return scope;
  }

  return scope?.querySelector?.(selector) ?? null;
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
  if (!node) {
    return;
  }

  if (!node.hasAttribute(nodeName)) {
    node.setAttribute(nodeName, 'true');
  }

  if (node.hasAttribute('hidden')) {
    node.removeAttribute('hidden');
  }
}

function createNode(tagName, nodeName) {
  const node = document.createElement(tagName);
  node.setAttribute(nodeName, 'true');
  node.dataset.adapterInjected = 'true';
  node.style.minHeight = '1px';
  return node;
}

function ensureToolRootId(node) {
  if (!node?.dataset) {
    return;
  }

  if (!node.dataset.toolRootId) {
    node.dataset.toolRootId = `tool-root-${Math.random().toString(16).slice(2)}`;
  }
}

function ensureExecutionPanel(scope, body, createdNodes, adaptedNodes) {
  const actionNode = findNode(scope, 'data-tool-actions')
    ?? getAliasNode(scope, 'data-tool-actions');

  if (actionNode && actionNode.matches?.('[data-tool-actions]') && actionNode.tagName !== 'BUTTON') {
    assignNodeAttribute(actionNode, 'data-tool-actions');
    adaptedNodes.push('data-tool-actions');
    return actionNode;
  }

  const panel = createNode('div', 'data-tool-actions');
  panel.classList.add('tool-execution-panel');
  body.appendChild(panel);
  createdNodes.push('data-tool-actions');
  adaptedNodes.push('data-tool-actions');

  if (actionNode && actionNode.parentElement !== panel) {
    panel.appendChild(actionNode);
  }

  return panel;
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

  const toolRoot = findNode(scope, 'data-tool-root')
    ?? getAliasNode(scope, 'data-tool-root')
    ?? scope.firstElementChild
    ?? (() => {
      const node = createNode('section', 'data-tool-root');
      scope.appendChild(node);
      createdNodes.push('data-tool-root');
      return node;
    })();

  assignNodeAttribute(toolRoot, 'data-tool-root');
  ensureToolRootId(toolRoot);
  adaptedNodes.push('data-tool-root');

  const body = findNode(scope, 'data-tool-body')
    ?? getAliasNode(scope, 'data-tool-body')
    ?? (() => {
      const node = createNode('section', 'data-tool-body');
      toolRoot.appendChild(node);
      createdNodes.push('data-tool-body');
      return node;
    })();

  assignNodeAttribute(body, 'data-tool-body');
  adaptedNodes.push('data-tool-body');

  const header = findNode(scope, 'data-tool-header')
    ?? getAliasNode(scope, 'data-tool-header')
    ?? (() => {
      const node = createNode('header', 'data-tool-header');
      toolRoot.prepend(node);
      createdNodes.push('data-tool-header');
      return node;
    })();

  assignNodeAttribute(header, 'data-tool-header');
  adaptedNodes.push('data-tool-header');

  const input = findNode(scope, 'data-tool-input')
    ?? getAliasNode(scope, 'data-tool-input')
    ?? (() => {
      const node = createNode('section', 'data-tool-input');
      body.appendChild(node);
      createdNodes.push('data-tool-input');
      return node;
    })();

  assignNodeAttribute(input, 'data-tool-input');
  adaptedNodes.push('data-tool-input');

  const resolvedOutput = findNode(scope, 'data-tool-output')
    ?? getAliasNode(scope, 'data-tool-output');

  const output = (() => {
    if (resolvedOutput && !resolvedOutput.hasAttribute('hidden')) {
      return resolvedOutput;
    }

    if (resolvedOutput?.hasAttribute('data-tool-output')) {
      resolvedOutput.removeAttribute('data-tool-output');
    }

    const node = createNode('section', 'data-tool-output');
    body.appendChild(node);
    createdNodes.push('data-tool-output');
    return node;
  })();

  assignNodeAttribute(output, 'data-tool-output');
  adaptedNodes.push('data-tool-output');

  ensureExecutionPanel(scope, body, createdNodes, adaptedNodes);

  const runtimeContainer = findNode(scope, 'data-runtime-container')
    ?? getAliasNode(scope, 'data-runtime-container')
    ?? scope.closest?.('[data-runtime-zone-shell], .tool-shell-page__runtime-zone-shell')
    ?? scope;

  assignNodeAttribute(runtimeContainer, 'data-runtime-container');
  adaptedNodes.push('data-runtime-container');

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
