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
function resolveRootHandoffTarget(root) {
  const canonicalRoot = root?.id === 'tool-root'
    ? root
    : root?.querySelector?.('#tool-root') ?? root;
  const runtimeZone = canonicalRoot?.querySelector?.('[data-tool-runtime]');
  if (!runtimeZone) {
    throw new Error('tool-template-loader: missing [data-tool-runtime] mount zone.');
  }

  const host = runtimeZone;
  const existing = host?.querySelector?.(':scope > [data-runtime-template-handoff]');
  if (existing) {
    return existing;
  }

  const handoff = document.createElement('section');
  handoff.setAttribute('data-runtime-template-handoff', 'true');
  handoff.className = 'tool-runtime-template-handoff';
  handoff.setAttribute('aria-label', 'Tool runtime template handoff');
  host?.prepend(handoff);
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
    const target = resolveRootHandoffTarget(root);
    target.innerHTML = sanitizeTemplateMarkup(cached);
    console.info('[RuntimeOwnership] template target = [data-tool-runtime]', { slug, cached: true });
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
  const target = resolveRootHandoffTarget(root);
  target.innerHTML = sanitizeTemplateMarkup(template);
  console.info('[RuntimeOwnership] template target = [data-tool-runtime]', { slug, cached: false });
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
