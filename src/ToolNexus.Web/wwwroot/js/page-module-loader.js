const hasNode = (selector) => Boolean(document.querySelector(selector));

if (hasNode('[data-tool-group], .tools-index')) {
  import('/js/tools-grid.js');
}

const hasRuntimeShell = hasNode('#tool-root[data-tool-root="true"]');
if (hasNode('.tool-page') && !hasRuntimeShell) {
  import('/js/tool-page.js');
}

if (hasNode('[data-reveal], [data-dynamic-stat]')) {
  import('/js/motion-system.js');
  import('/js/dynamic-widget-engine.js');
}
