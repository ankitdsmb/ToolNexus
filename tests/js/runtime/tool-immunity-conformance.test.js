import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mountToolLifecycle, inspectLifecycleContract } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-lifecycle-adapter.js';
import { createToolExecutionContext } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-execution-context.js';
import { invokeExecutionToolSafely, safeNoopResult } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-safe-tool-wrapper.js';
import { normalizeToolPageExecutionResult } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-page-result-normalizer.js';

function resolveToolModulePath(slug) {
  const candidates = [
    path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot/js/tools/${slug}.js`),
    path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot/js/tools/${slug}/index.js`),
    path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot/js/tools/${slug}/main.js`)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function createToolShellRoot(slug) {
  const root = document.createElement('section');
  root.setAttribute('data-tool-shell', 'true');
  root.setAttribute('data-tool-root', 'true');
  root.dataset.toolSlug = slug;
  root.innerHTML = `
    <header data-tool-context="true" data-tool-header="true"></header>
    <section data-tool-input="true"><textarea id="inputEditor"></textarea></section>
    <div data-tool-status="true"></div>
    <section data-tool-output="true" id="outputField"></section>
    <footer data-tool-followup="true" data-tool-actions="true"><button id="runBtn" type="button">Run</button></footer>
  `;

  document.body.appendChild(root);
  return root;
}

describe('tool immunity conformance', () => {
  jest.setTimeout(30000);
  const manifestPath = path.resolve(process.cwd(), 'tools.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const tools = manifest.tools ?? [];

  test.each(tools.map((tool) => [tool.slug, tool]))('%s mounts lifecycle, enforces ToolShell anchors, and normalizes output contracts', async (slug, tool) => {
    const modulePath = resolveToolModulePath(slug);
    expect(modulePath).not.toBeNull();

    const module = await import(pathToFileURL(modulePath).href);
    const root = createToolShellRoot(slug);
    const context = createToolExecutionContext({ slug, root, manifest: tool });

    const lifecycleInspection = inspectLifecycleContract(module);
    const lifecycle = await mountToolLifecycle({
      module,
      slug,
      root,
      manifest: tool,
      context
    });

    expect(lifecycle).toEqual(expect.objectContaining({
      mounted: expect.any(Boolean),
      mode: expect.any(String),
      normalized: expect.any(Boolean),
      autoDestroyGenerated: expect.any(Boolean)
    }));

    if (lifecycleInspection.compliant) {
      expect(lifecycle.mounted).toBe(true);
      expect(typeof lifecycle.cleanup).toBe('function');
    }

    expect(root.querySelector('[data-tool-shell]') ?? root).toBeTruthy();
    expect(root.querySelector('[data-tool-input]')).toBeTruthy();
    expect(root.querySelector('[data-tool-output]')).toBeTruthy();
    expect(root.querySelector('[data-tool-status]')).toBeTruthy();
    expect(root.querySelector('[data-tool-followup]')).toBeTruthy();

    await lifecycle.cleanup?.();
    await context.destroy();

    const runTool = module.runTool ?? module.default?.runTool;
    if (typeof runTool === 'function') {
      const result = await invokeExecutionToolSafely(runTool.bind(module), document.createElement('div'), { malformed: true }, { toolSlug: slug });
      expect(result).toEqual(safeNoopResult('unsupported_action'));

      const normalized = normalizeToolPageExecutionResult(result);
      expect(normalized).toEqual(expect.objectContaining({
        shouldAbort: true,
        reason: 'unsupported_action',
        output: expect.any(String),
        ok: false
      }));
    }

    root.remove();
  });
});
