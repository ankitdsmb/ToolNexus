export const pageMatrix = {
  typeA: {
    home: '/',
    about: '/about',
    contact: '/contact-us'
  },
  typeB: {
    toolsIndex: '/tools',
    category: '/tools/json-tools'
  },
  typeC: {
    jsonFormatter: '/tools/json-formatter',
    base64Encode: '/tools/base64-encode'
  }
};

export const contractSelectors = {
  typeA: {
    home: ['#toolSearch', '#featuredGrid', '#trendingTools', '#recentTools'],
    contact: ['#contactForm', '#contactStatus', '#messageCounter', '#name', '#email', '#subject', '#message']
  },
  typeB: {
    toolsIndex: ['#toolsSearchInput', '[data-category-filter]', '[data-density]', '[data-tool-group]', '.tool-grid', '.tool-card[data-tool-slug]'],
    category: ['.tool-grid#toolGrid', '.tool-card[data-tool-slug]']
  },
  typeC: {
    toolRuntime: ['#tool-root[data-tool-root="true"]', '[data-tool-header]', '[data-tool-body]', '[data-tool-input]', '[data-tool-output]', '[data-tool-actions]']
  }
};
