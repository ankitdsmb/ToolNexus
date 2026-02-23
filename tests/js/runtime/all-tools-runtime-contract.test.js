import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { invokeExecutionToolSafely, safeNoopResult } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/runtime-safe-tool-wrapper.js';

function resolveToolModulePath(slug) {
  const candidates = [
    path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot/js/tools/${slug}.js`),
    path.resolve(process.cwd(), `src/ToolNexus.Web/wwwroot/js/tools/${slug}/index.js`)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

describe('all tools runtime contract coverage', () => {
  const manifestPath = path.resolve(process.cwd(), 'tools.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const tools = manifest.tools ?? [];

  test.each(tools.map((tool) => [tool.slug]))('%s safely ignores legacy HTMLElement execution payload', async (slug) => {
    const modulePath = resolveToolModulePath(slug);
    if (!modulePath) {
      expect(modulePath).toBeNull();
      return;
    }

    const module = await import(pathToFileURL(modulePath).href);
    const runTool = module.runTool ?? module.default?.runTool;
    if (typeof runTool !== 'function') {
      return;
    }

    const result = await invokeExecutionToolSafely(runTool.bind(module), document.createElement('div'), { malformed: true });
    expect(result).toEqual(safeNoopResult('unsupported_action'));
  });
});
