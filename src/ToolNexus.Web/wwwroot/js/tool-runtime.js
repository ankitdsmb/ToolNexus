async function bootstrapToolRuntime() {
  const root = document.getElementById('tool-root');
  if (!root) {
    return;
  }

  const slug = (root.dataset.toolSlug || '').trim();
  if (!slug) {
    console.error('tool-runtime: missing tool slug on #tool-root.');
    return;
  }

  try {
    const manifest = await loadManifest(slug);
    if (manifest.cssPath) {
      ensureStylesheet(manifest.cssPath);
    }

    const modulePath = manifest.modulePath || window.ToolNexusConfig?.runtimeModulePath;
    if (!modulePath) {
      console.warn(`tool-runtime: no module path found for "${slug}".`);
      return;
    }

    const module = await import(modulePath);
    await mountToolModule({ module, slug, root, manifest });
  } catch (error) {
    console.error(`tool-runtime: failed to initialize "${slug}".`, error);
  }
}

async function loadManifest(slug) {
  const response = await fetch(`/tools/manifest/${encodeURIComponent(slug)}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Manifest request failed (${response.status}).`);
  }

  return response.json();
}

function ensureStylesheet(cssPath) {
  if (!cssPath || document.querySelector(`link[data-tool-css="${cssPath}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssPath;
  link.dataset.toolCss = cssPath;
  document.head.appendChild(link);
}

async function mountToolModule({ module, slug, root, manifest }) {
  if (typeof module.mount === 'function') {
    await module.mount(root, manifest);
    return;
  }

  if (typeof module.default?.mount === 'function') {
    await module.default.mount(root, manifest);
    return;
  }

  if (typeof module.init === 'function') {
    module.init(root, manifest);
    return;
  }

  const legacyModule = window.ToolNexusModules?.[slug];
  if (legacyModule?.mount) {
    legacyModule.mount(root, manifest);
    return;
  }

  if (legacyModule?.init) {
    legacyModule.init(root, manifest);
    return;
  }

  if (legacyModule?.create) {
    const handle = legacyModule.create(root, manifest);
    handle?.init?.();
    return;
  }

  console.warn(`tool-runtime: module loaded for "${slug}" but no mount/init API found.`);
}

bootstrapToolRuntime();
