import { createUnifiedToolControlRuntime } from './tool-unified-control-runtime.js';

const templateCache = new Map();

function isGenericLoadingTemplate(template, slug) {
  const normalized = template.replace(/\s+/g, ' ').trim().toLowerCase();
  const expected = `loading ${slug.toLowerCase()}...`;
  return normalized.includes('tool-generic-template') && normalized.includes(expected);
}

function validateGenericTemplateContract(root) {
  const hasLegacyPanels = Boolean(root.querySelector('.tool-layout__panel'));
  const hasUnifiedContract = Boolean(root.querySelector('[data-template-contract="unified-control"]'));

  if (!hasLegacyPanels && !hasUnifiedContract) {
    throw new Error('Template contract violation.');
  }
}

export async function loadToolTemplate(slug, root, { fetchImpl = fetch, templatePath, manifest, config = window.ToolNexusConfig } = {}) {
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
  const template = rawTemplate;

  templateCache.set(slug, template);
  if (usedLegacyFallback) {
    createUnifiedToolControlRuntime({ root, slug, manifest, config });
  } else {
    root.innerHTML = template;
  }

  if (usedLegacyFallback || root.querySelector('[data-template-contract="generic"]') || root.querySelector('[data-template-contract="unified-control"]')) {
    validateGenericTemplateContract(root);
  }

  return template;
}

export function clearToolTemplateCache() {
  templateCache.clear();
}
