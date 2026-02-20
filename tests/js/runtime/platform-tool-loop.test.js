import fs from 'node:fs';
import path from 'node:path';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateToolDomContract } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

const repoRoot = process.cwd();
const webRoot = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot');
const templatesRoot = path.join(webRoot, 'tool-templates');

function discoverToolTemplates() {
  return fs.readdirSync(templatesRoot)
    .filter((file) => file.endsWith('.html'))
    .map((file) => ({
      slug: file.replace(/\.html$/, ''),
      filePath: path.join(templatesRoot, file)
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

describe('platform strict template validation loop', () => {
  const templates = discoverToolTemplates();

  test('every tool template is discovered for QA loop', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  test.each(templates)('validates and boots %s template without runtime deadlock', async ({ slug, filePath }) => {
    const template = fs.readFileSync(filePath, 'utf8');
    document.body.innerHTML = `<div id="tool-root" data-tool-slug="${slug}"></div>`;

    const root = document.getElementById('tool-root');
    root.innerHTML = template;

    const preValidation = validateToolDomContract(root, slug);

    let initialized = false;
    const runtime = createToolRuntime({
      loadManifest: async () => ({ slug, dependencies: [], modulePath: `/js/tools/${slug}.js` }),
      templateLoader: async (_slug, mountRoot) => {
        mountRoot.innerHTML = template;
      },
      templateBinder: () => {},
      dependencyLoader: { loadDependencies: async () => undefined },
      importModule: async () => ({ init: () => { initialized = true; } }),
      lifecycleAdapter: async ({ module }) => {
        module?.init?.();
        return { mounted: true };
      },
      legacyBootstrap: async () => ({ mounted: false }),
      legacyAutoInit: async () => ({ mounted: false })
    });

    await runtime.bootstrapToolRuntime();

    const postValidation = validateToolDomContract(root, slug);

    expect(preValidation.errors.join('\n')).not.toContain('Missing root element');
    expect(postValidation.valid).toBe(true);
    expect(postValidation.errors).toEqual([]);
    expect(root.querySelector('[data-tool-input]')).not.toBeNull();
    expect(root.querySelector('[data-tool-output]')).not.toBeNull();
    expect(root.textContent).not.toContain('Loading...');
    expect(root.querySelector('.tool-contract-error')).toBeNull();
    expect(initialized).toBe(true);
  });
});
