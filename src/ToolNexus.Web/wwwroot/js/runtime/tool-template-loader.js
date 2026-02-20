const templateCache = new Map();

function isGenericLoadingTemplate(template, slug) {
  const normalized = template.replace(/\s+/g, ' ').trim().toLowerCase();
  const expected = `loading ${slug.toLowerCase()}...`;
  return normalized.includes('tool-generic-template') && normalized.includes(expected);
}

function buildLegacyScaffoldTemplate(slug) {
  return `
    <article class="tool-page" data-slug="${slug}" data-tool="${slug}">
      <header class="tool-page__heading">
        <div>
          <h1>${slug}</h1>
          <p>Compatibility scaffold loaded by ToolShell runtime.</p>
        </div>
      </header>
      <section class="tool-toolbar">
        <div class="tool-toolbar__actions">
          <button id="runBtn" class="tool-btn tool-btn--primary" type="button"><span class="tool-btn__label">Run</span></button>
        </div>
        <div class="tool-page__action-selector"></div>
      </section>
      <section id="errorMessage" class="tool-error" hidden></section>
      <section class="tool-workspace">
        <div class="tool-workspace__pane">
          <h2>Input</h2>
          <textarea id="inputEditor" rows="14" spellcheck="false"></textarea>
        </div>
        <div class="tool-workspace__pane">
          <h2>Output</h2>
          <textarea id="outputEditor" rows="14" spellcheck="false"></textarea>
        </div>
      </section>
      <p id="editorShortcutHint" class="tool-shortcut-hint">Ctrl/Cmd + Enter to run.</p>
      <p id="resultStatus" class="tool-result-status">Ready.</p>
    </article>
  `;
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

  const template = isGenericLoadingTemplate(rawTemplate, slug)
    ? buildLegacyScaffoldTemplate(slug)
    : rawTemplate;

  templateCache.set(slug, template);
  root.innerHTML = template;
  return template;
}

export function clearToolTemplateCache() {
  templateCache.clear();
}
