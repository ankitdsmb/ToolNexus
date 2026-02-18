function normalizeText(value) {
  return (value || '').trim();
}

export function initializeVersionManager() {
  const versionNode = document.querySelector('[data-version-display][data-build-number]');
  if (!versionNode) {
    return;
  }

  const version = normalizeText(versionNode.getAttribute('data-version-display'));
  const build = normalizeText(versionNode.getAttribute('data-build-number'));

  if (!version || !build) {
    return;
  }

  versionNode.textContent = `${version} · Build ${build}`;
  versionNode.setAttribute('title', `Version ${version}, build ${build}`);
}

initializeVersionManager();
