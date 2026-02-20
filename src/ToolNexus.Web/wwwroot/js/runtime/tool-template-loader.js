const templateCache = new Map();

function isGenericLoadingTemplate(template, slug) {
  const normalized = template.replace(/\s+/g, ' ').trim().toLowerCase();
  const expected = `loading ${slug.toLowerCase()}...`;
  return normalized.includes('tool-generic-template') && normalized.includes(expected);
}

function buildGenericContractTemplate(slug) {
  return `
    <section class="tool-page" data-slug="${slug}" data-template-contract="generic">
      <div class="tool-layout">
        <section class="tool-layout__panel">
          <textarea id="inputEditor" class="tool-editor"></textarea>
        </section>
        <section class="tool-panel--output">
          <textarea id="outputField" class="tool-editor"></textarea>
        </section>
      </div>
    </section>
  `;
}

function validateGenericTemplateContract(root) {
  if (!root.querySelector('.tool-layout__panel')) {
    throw new Error('Template contract violation.');
  }
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
    root.innerHTML = cached;
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
  root.innerHTML = template;

  if (usedLegacyFallback || root.querySelector('[data-template-contract="generic"]')) {
    validateGenericTemplateContract(root);
  }

  return template;
}

export function clearToolTemplateCache() {
  templateCache.clear();
}
