const templateCache = new Map();

export async function loadToolTemplate(slug, root, { fetchImpl = fetch } = {}) {
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

  const response = await fetchImpl(`/tool-templates/${encodeURIComponent(slug)}.html`, {
    headers: { Accept: 'text/html' }
  });

  if (!response.ok) {
    throw new Error(`tool-template-loader: failed to load template for "${slug}" (${response.status}).`);
  }

  const template = await response.text();
  if (!template.trim()) {
    throw new Error(`tool-template-loader: template for "${slug}" is empty.`);
  }

  templateCache.set(slug, template);
  root.innerHTML = template;
  return template;
}

export function clearToolTemplateCache() {
  templateCache.clear();
}
