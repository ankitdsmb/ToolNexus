export function createTestRoot(slug = 'case-converter') {
  const root = document.createElement('div');
  root.className = 'tool-page';
  root.dataset.slug = slug;
  root.innerHTML = `
    <div class="tool-page__heading"><p></p></div>
    <div class="tool-page__action-selector"></div>
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <select id="actionSelect"><option value="camel-case">camelCase</option></select>
    <button id="runBtn" type="button"></button>
    <button id="copyBtn" type="button"></button>
    <div id="resultStatus"></div>
  `;
  document.body.appendChild(root);
  return root;
}

export function mountTool(create, root) {
  const handle = create(root);
  handle?.create();
  handle?.init();
  return handle;
}

export function destroyTool(handle) {
  handle?.destroy();
}
