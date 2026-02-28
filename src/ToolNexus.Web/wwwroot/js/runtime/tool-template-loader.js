const templateCache = new Map();

function isGenericLoadingTemplate(template, slug) {
  const normalized = template.replace(/\s+/g, ' ').trim().toLowerCase();
  const expected = `loading ${slug.toLowerCase()}...`;
  return normalized.includes('tool-generic-template') && normalized.includes(expected);
}

function buildGenericContractTemplate(slug) {
  return `
    <section class="tool-runtime-widget" data-slug="${slug}" data-template-contract="generic">
      <header class="tool-local-header">
        <h2>${slug}</h2>
      </header>
      <section class="tool-local-actions" aria-label="Tool actions"></section>
      <section class="tool-local-body">
      <section data-tool-zone="input">
        <label for="inputEditor">Input</label>
        <textarea id="inputEditor" class="tool-editor"></textarea>
      </section>
      <section data-tool-zone="output">
        <label for="outputField">Output</label>
        <textarea id="outputField" class="tool-editor"></textarea>
      </section>
      </section>
      <section class="tool-local-metrics"></section>
    </section>
  `;
}

function validateGenericTemplateContract(markup) {
  const probe = document.createElement('div');
  probe.innerHTML = markup;
  if (!probe.querySelector('[data-tool-zone="input"]')) {
    throw new Error('Template contract violation.');
  }
}

function sanitizeTemplateMarkup(markup) {
  const container = document.createElement('div');
  container.innerHTML = markup;

  for (const nestedRuntimeContainer of container.querySelectorAll('[data-tool-shell], #tool-root, [data-runtime-container]')) {
    nestedRuntimeContainer.removeAttribute('data-tool-shell');
    nestedRuntimeContainer.removeAttribute('data-runtime-container');
    if (nestedRuntimeContainer.id === 'tool-root') {
      nestedRuntimeContainer.removeAttribute('id');
    }
  }

  return container.innerHTML;
}

function resolveTemplateMountMode() {
  const configured = String(window.ToolNexusConfig?.runtimeTemplateMountMode ?? 'content-host').trim().toLowerCase();
  if (configured === 'legacy') {
    console.warn('[RuntimeOwnership] legacy template mount mode is deprecated; enforcing content-host ownership.');
  }

  // Architecture lock: runtime templates always mount through the ToolShell content host.
  return 'content-host';
}

function emitMountTargetTelemetry(slug, mountTarget, mountMode) {
  console.info(`runtime.template.mountTarget = ${mountTarget}`, { slug, mountMode, mountTarget });
}

function resolveRootHandoffTarget(root, slug) {
  const canonicalRoot = root?.id === 'tool-root'
    ? root
    : root?.querySelector?.('#tool-root') ?? root;

  const mountMode = resolveTemplateMountMode();
  // ToolShell owns frame, tool widget owns internals:
  // the only first-class runtime handoff target is data-tool-content-host.
  const candidates = [
    { key: 'content-host', selector: '[data-tool-content-host]' },
    { key: 'root', selector: null }
  ];

  let host = null;
  let mountTarget = 'root';
  for (const candidate of candidates) {
    const resolved = candidate.selector
      ? canonicalRoot?.querySelector?.(candidate.selector)
      : canonicalRoot;
    if (resolved) {
      host = resolved;
      mountTarget = candidate.key;
      break;
    }
  }

  if (!host) {
    throw new Error('tool-template-loader: missing mount zone ([data-tool-content-host] -> #tool-root).');
  }

  const existing = host?.querySelector?.(':scope > [data-runtime-template-handoff]');
  if (existing) {
    emitMountTargetTelemetry(slug, mountTarget, mountMode);
    return existing;
  }

  const handoff = document.createElement('section');
  handoff.setAttribute('data-runtime-template-handoff', 'true');
  handoff.dataset.runtimeTemplateMountTarget = mountTarget;
  handoff.className = 'tool-runtime-template-handoff';
  handoff.setAttribute('aria-label', 'Tool runtime template handoff');
  host.prepend(handoff);
  emitMountTargetTelemetry(slug, mountTarget, mountMode);
  return handoff;
}

export async function loadToolTemplate(slug, root, { fetchImpl = fetch, templatePath } = {}) {
  if (!slug) {
    throw new Error('tool-template-loader: missing tool slug.');
  }

  if (!root) {
    throw new Error(`tool-template-loader: missing mount root for "${slug}".`);
  }

  const cached = templateCache.get(slug);
  if (cached) {
    const target = resolveRootHandoffTarget(root, slug);
    target.innerHTML = sanitizeTemplateMarkup(cached);
    console.info('[RuntimeOwnership] shell anchors preserved', { slug, target: '[data-tool-shell]' });
    console.info('[RuntimeOwnership] no mutation performed', { slug, operation: 'zone-clearing-skipped' });
    return cached;
  }

  const resolvedTemplatePath = templatePath || `/tool-templates/${encodeURIComponent(slug)}.html`;

  const response = await fetchImpl(resolvedTemplatePath, {
    headers: { Accept: 'text/html' }
  });

  if (!response.ok) {
    throw new Error(`tool-template-loader: failed to load template for "${slug}" (${response.status}).`);
  }

  const rawTemplate = await response.text();
  if (!rawTemplate.trim()) {
    throw new Error(`tool-template-loader: template for "${slug}" is empty.`);
  }

  const usedLegacyFallback = isGenericLoadingTemplate(rawTemplate, slug);
  const template = usedLegacyFallback
    ? buildGenericContractTemplate(slug)
    : rawTemplate;

  templateCache.set(slug, template);
  const target = resolveRootHandoffTarget(root, slug);
  target.innerHTML = sanitizeTemplateMarkup(template);
  console.info('[RuntimeOwnership] shell anchors preserved', { slug, target: '[data-tool-shell]' });
  console.info('[RuntimeOwnership] no mutation performed', { slug, operation: 'zone-clearing-skipped' });

  if (usedLegacyFallback || template.includes('data-template-contract="generic"')) {
    validateGenericTemplateContract(template);
  }

  return template;
}

export function clearToolTemplateCache() {
  templateCache.clear();
}
