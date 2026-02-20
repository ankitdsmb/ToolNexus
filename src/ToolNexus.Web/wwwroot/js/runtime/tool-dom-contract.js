export const TOOL_DOM_CONTRACT = {
  requiredSelectors: [
    '.tool-page',
    '.tool-layout',
    '.tool-layout__panel',
    '.tool-panel--output',
    '#inputEditor',
    '#outputField'
  ],
  requiredAttributes: [
    { selector: '.tool-page', attribute: 'data-slug' }
  ]
};
