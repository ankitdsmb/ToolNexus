export const TOOL_DOM_CONTRACT = {
  requiredNodes: [
    'data-tool-shell',
    'data-tool-context',
    'data-tool-input',
    'data-tool-status',
    'data-tool-output',
    'data-tool-followup',
    'data-tool-content-host'
  ],
  nodeSelectors: {
    'data-tool-shell': '[data-tool-shell]',
    'data-tool-context': '[data-tool-context]',
    'data-tool-input': '[data-tool-input]',
    'data-tool-status': '[data-tool-status]',
    'data-tool-output': '[data-tool-output]',
    'data-tool-followup': '[data-tool-followup]',
    'data-tool-content-host': '[data-tool-content-host]'
  },
  legacyAliases: {
    'data-tool-shell': ['[data-tool-root]', '.tool-page', '.tool-runtime-fallback'],
    'data-tool-context': ['[data-tool-header]', '.tn-tool-header', '.tool-header'],
    'data-tool-input': ['.tool-controls', '#inputEditor', '.editor-input'],
    'data-tool-status': ['.tn-unified-tool-control__status', '.tool-status', '[role="status"]'],
    'data-tool-output': ['.tool-result', '#outputField', '.tool-panel--output', '.editor-output'],
    'data-tool-followup': ['[data-tool-actions]', '.tool-actions', '.tool-toolbar', '.tool-controls-actions'],
    'data-tool-content-host': ['[data-tool-runtime]', '.runtime-tool-ui-mount', '[data-runtime-template-handoff]']
  }
};

export const LAYOUT_TYPES = {
  MODERN_LAYOUT: 'MODERN_LAYOUT',
  LEGACY_LAYOUT: 'LEGACY_LAYOUT',
  MINIMAL_LAYOUT: 'MINIMAL_LAYOUT',
  UNKNOWN_LAYOUT: 'UNKNOWN_LAYOUT'
};
