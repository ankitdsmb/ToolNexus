import { TOOL_DOM_CONTRACT } from './tool-dom-contract.js';

function normalizeRoot(root) {
  if (root?.nodeType === Node.ELEMENT_NODE || root?.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root;
  }

  return null;
}

export function validateToolDomContract(root, slug = '') {
  const scope = normalizeRoot(root);
  const errors = [];

  if (!scope) {
    return {
      valid: false,
      errors: ['[DOM CONTRACT ERROR]', 'Missing root element for DOM contract validation.']
    };
  }

  for (const selector of TOOL_DOM_CONTRACT.requiredSelectors) {
    if (!scope.querySelector(selector)) {
      errors.push(`Missing selector: ${selector}`);
    }
  }

  for (const requirement of TOOL_DOM_CONTRACT.requiredAttributes) {
    const element = scope.querySelector(requirement.selector);
    if (!element || !element.hasAttribute(requirement.attribute) || !element.getAttribute(requirement.attribute)?.trim()) {
      errors.push(`Missing attribute ${requirement.attribute} on ${requirement.selector}`);
      continue;
    }

    if (requirement.selector === '.tool-page' && requirement.attribute === 'data-slug' && slug) {
      const currentSlug = element.getAttribute('data-slug')?.trim();
      if (currentSlug && currentSlug !== slug) {
        errors.push(`Mismatched data-slug on .tool-page. Expected "${slug}" but found "${currentSlug}".`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? ['[DOM CONTRACT ERROR]', ...errors] : []
  };
}
