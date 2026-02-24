export const TOOL_DOM_CONTRACT = {
  requiredNodes: [
    'data-tool-root',
    'data-tool-header',
    'data-tool-body',
    'data-tool-input',
    'data-tool-output',
    'data-tool-actions',
    'data-runtime-container'
  ],
  nodeSelectors: {
    'data-tool-root': '[data-tool-root]',
    'data-tool-header': '[data-tool-header]',
    'data-tool-body': '[data-tool-body]',
    'data-tool-input': '[data-tool-input]',
    'data-tool-output': '[data-tool-output]',
    'data-tool-actions': '[data-tool-actions]',
    'data-runtime-container': '[data-runtime-container]'
  },
  legacyAliases: {
    'data-tool-root': ['.tool-page', '.tool-runtime-fallback'],
    'data-tool-header': ['.tn-tool-header', '.tool-header', 'header'],
    'data-tool-body': ['.tool-layout', '.tn-tool-body', '.tool-body', 'main'],
    'data-tool-input': ['.tool-controls', '#inputEditor', 'textarea', 'input[type="text"]', '.editor-input'],
    'data-tool-output': ['.tool-result', '#outputField', '.tool-panel--output', '.editor-output', 'pre', 'output'],
    'data-tool-actions': ['.tool-actions', '.tool-toolbar', '.tool-controls-actions', 'button'],
    'data-runtime-container': ['[data-runtime-zone-shell]', '.tool-shell-page__runtime-zone-shell']
  }
};

export const LAYOUT_TYPES = {
  MODERN_LAYOUT: 'MODERN_LAYOUT',
  LEGACY_LAYOUT: 'LEGACY_LAYOUT',
  MINIMAL_LAYOUT: 'MINIMAL_LAYOUT',
  UNKNOWN_LAYOUT: 'UNKNOWN_LAYOUT'
};
