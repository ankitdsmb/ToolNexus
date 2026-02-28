const templateCache = new Map();

function isGenericLoadingTemplate(template, slug) {
  const normalized = template.replace(/\s+/g, ' ').trim().toLowerCase();
  const expected = `loading ${slug.toLowerCase()}...`;
  return normalized.includes('tool-generic-template') && normalized.includes(expected);
}

function buildGenericContractTemplate(slug) {
  return `
    <section class="tool-runtime-local tool-local-root" data-slug="${slug}" data-template-contract="generic">
      <section data-tool-zone="input">
        <label for="inputEditor">Input</label>
        <textarea id="inputEditor" class="tool-editor"></textarea>
      </section>
      <section data-tool-zone="output">
        <label for="outputField">Output</label>
        <textarea id="outputField" class="tool-editor"></textarea>
      </section>
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

const INPUT_TOKENS = ['input', 'action', 'option', 'control', 'config', 'toolbar'];
const OUTPUT_TOKENS = ['output', 'result', 'preview', 'metric', 'status', 'error', 'report'];

function tokenizeNode(node) {
  const tokens = [
    node.id,
    node.className,
    node.getAttribute?.('aria-label'),
    node.getAttribute?.('data-tool-zone')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return tokens;
}

function isOutputNode(node) {
  const tokens = tokenizeNode(node);
  return OUTPUT_TOKENS.some((token) => tokens.includes(token));
}

function isInputNode(node) {
  const tokens = tokenizeNode(node);
  return INPUT_TOKENS.some((token) => tokens.includes(token));
}

function toToolLocalRoot(className, runtimeClassName = "") {
  const node = document.createElement('div');
  node.className = `${className} ${runtimeClassName}`.trim();
  return node;
}

function resolveTemplateNodes(markup) {
  const container = document.createElement('div');
  container.innerHTML = markup;

  const runtimeRoot = container.querySelector('.tool-runtime-local') ?? container;
  const inputNodes = [];
  const outputNodes = [];

  for (const child of Array.from(runtimeRoot.children)) {
    if (child.classList.contains('tool-local-sections') || child.classList.contains('tool-editors')) {
      const panels = Array.from(child.querySelectorAll(':scope > .tool-local-surface, :scope > .tool-editor-panel'));
      if (panels.length > 0) {
        const [firstPanel, ...remainingPanels] = panels;
        inputNodes.push(firstPanel);
        outputNodes.push(...remainingPanels);
      }
      continue;
    }

    const explicitZone = (child.getAttribute('data-tool-zone') || '').trim().toLowerCase();
    if (explicitZone === 'output' || explicitZone === 'status') {
      outputNodes.push(child);
      continue;
    }

    if (explicitZone === 'input') {
      inputNodes.push(child);
      continue;
    }

    if (isOutputNode(child) && !isInputNode(child)) {
      outputNodes.push(child);
      continue;
    }

    inputNodes.push(child);
  }

  if (outputNodes.length === 0 && inputNodes.length > 0) {
    outputNodes.push(inputNodes.pop());
  }

  return { inputNodes, outputNodes, runtimeClassName: runtimeRoot.className || "" };
}

function resolveToolShellInjectionTarget(root) {
  const outputZone = root.querySelector('[data-tool-output]');
  const inputZone = root.querySelector('[data-tool-input]');

  if (inputZone && outputZone) {
    return { inputZone, outputZone, hasToolShellAnchors: true };
  }

  return { inputZone: root, outputZone: root, hasToolShellAnchors: false };
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
    const target = resolveToolShellInjectionTarget(root);
    const { inputNodes, outputNodes, runtimeClassName } = resolveTemplateNodes(cached);

    if (!target.hasToolShellAnchors) {
      target.inputZone.innerHTML = cached;
      return cached;
    }

    const inputRoot = toToolLocalRoot('tool-local-root tool-local-root--input', runtimeClassName);
    const outputRoot = toToolLocalRoot('tool-local-root tool-local-root--output', runtimeClassName);
    inputRoot.append(...inputNodes);
    outputRoot.append(...outputNodes);
    target.inputZone.replaceChildren(inputRoot);
    target.outputZone.replaceChildren(outputRoot);
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
  const target = resolveToolShellInjectionTarget(root);
  const { inputNodes, outputNodes, runtimeClassName } = resolveTemplateNodes(template);

  if (!target.hasToolShellAnchors) {
    target.inputZone.innerHTML = template;
  } else {
    const inputRoot = toToolLocalRoot('tool-local-root tool-local-root--input', runtimeClassName);
    const outputRoot = toToolLocalRoot('tool-local-root tool-local-root--output', runtimeClassName);
    inputRoot.append(...inputNodes);
    outputRoot.append(...outputNodes);
    target.inputZone.replaceChildren(inputRoot);
    target.outputZone.replaceChildren(outputRoot);
  }

  if (usedLegacyFallback || template.includes('data-template-contract="generic"')) {
    validateGenericTemplateContract(template);
  }

  return template;
}

export function clearToolTemplateCache() {
  templateCache.clear();
}
