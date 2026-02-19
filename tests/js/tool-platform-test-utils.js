export function createTestRoot(markup, className = 'tool-root') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<section class="${className}">${markup}</section>`;
  const root = wrapper.firstElementChild;
  document.body.appendChild(root);
  return root;
}

export function mountTool(factory, root) {
  const handle = factory(root);
  handle?.create?.();
  handle?.init?.();
  return handle;
}

export function destroyTool(handle) {
  handle?.destroy?.();
}
