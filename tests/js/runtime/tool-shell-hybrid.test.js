import fs from 'node:fs';
import path from 'node:path';
import { jest } from '@jest/globals';
import { bindTemplateData } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-template-binder.js';
import { createToolRuntime } from '../../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

describe('hybrid SSR tool shell runtime', () => {
  const repoRoot = process.cwd();

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    delete window.ToolNexusConfig;
  });

  test('SEO markup exists in SSR ToolShell view', () => {
    const shellPath = path.join(repoRoot, 'src/ToolNexus.Web/Views/Tools/ToolShell.cshtml');
    const shell = fs.readFileSync(shellPath, 'utf8');

    expect(shell).toContain('class="tool-seo');
    expect(shell).toContain('<h1>@Model.Tool.Title</h1>');
    expect(shell).toContain('Model.Content?.Intro ?? Model.Tool.SeoDescription');
    expect(shell).toContain('\"Examples\"');
  });

  test('runtime templates contain no Razor tokens', () => {
    const templateDir = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot/tool-templates');
    const templateFiles = fs.readdirSync(templateDir).filter((name) => name.endsWith('.html'));

    for (const file of templateFiles) {
      const template = fs.readFileSync(path.join(templateDir, file), 'utf8');
      expect(template).not.toMatch(/@Model\.|@string\.Join|asp-append-version/);
    }
  });

  test('data binder injects text and input values', () => {
    document.body.innerHTML = `
      <div id="tool-root">
        <h1 data-bind="tool.title"></h1>
        <p data-bind="tool.seoDescription"></p>
        <textarea id="input" data-bind="tool.exampleInput"></textarea>
        <input id="slugInput" data-bind="tool.slug" />
      </div>`;

    bindTemplateData(document.getElementById('tool-root'), {
      tool: {
        title: 'JSON Formatter',
        seoDescription: 'Format JSON with live validation.',
        exampleInput: '{"ok":true}',
        slug: 'json-formatter'
      }
    });

    expect(document.querySelector('h1').textContent).toBe('JSON Formatter');
    expect(document.querySelector('p').textContent).toBe('Format JSON with live validation.');
    expect(document.getElementById('input').value).toBe('{"ok":true}');
    expect(document.getElementById('slugInput').value).toBe('json-formatter');
  });

  test('tool lifecycle runs after data binding', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="json-formatter"></div>';
    window.ToolNexusConfig = { tool: { title: 'Bound Title' } };
    const events = [];

    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js' }),
      templateLoader: async (_, root) => {
        root.innerHTML = '<h2 id="title" data-bind="tool.title"></h2>';
        events.push('template');
      },
      templateBinder: (root, config) => {
        bindTemplateData(root, config);
        events.push('bind');
      },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({
        mount: (root) => {
          events.push('mount');
          expect(root.querySelector('#title').textContent).toBe('Bound Title');
          root.insertAdjacentHTML('beforeend', '<div id="mounted"></div>');
        }
      })
    });

    await runtime.bootstrapToolRuntime();

    expect(events).toEqual(expect.arrayContaining(['template', 'bind']));
  });

  test('tool root container is not empty after mount', async () => {
    document.body.innerHTML = '<div id="tool-root" data-tool-slug="base64-encode"></div>';

    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js' }),
      templateLoader: async (_, root) => {
        root.innerHTML = '<section id="ui"></section>';
      },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({ mount: async () => {} })
    });

    await runtime.bootstrapToolRuntime();

    expect(document.getElementById('tool-root').children.length).toBeGreaterThan(0);
  });

  test('runtime mount does not overwrite SSR SEO section', async () => {
    document.body.innerHTML = `
      <section class="tool-seo">
        <h1>Server Title</h1>
        <p>Server Description</p>
      </section>
      <div id="tool-root" data-tool-slug="yaml-to-json"></div>`;

    const runtime = createToolRuntime({
      loadManifest: async () => ({ modulePath: '/module.js' }),
      templateLoader: async (_, root) => {
        root.innerHTML = '<div class="tool-ui">UI</div>';
      },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({ mount: async () => {} })
    });

    await runtime.bootstrapToolRuntime();

    expect(document.querySelector('.tool-seo h1').textContent).toBe('Server Title');
    expect(document.querySelector('.tool-seo p').textContent).toBe('Server Description');
    expect(document.querySelector('#tool-root .tool-ui')).not.toBeNull();
  });
});
