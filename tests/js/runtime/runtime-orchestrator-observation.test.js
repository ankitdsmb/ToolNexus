import fs from 'node:fs';
import path from 'node:path';

import { applyAiRuntimeOrchestrator } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/ai-runtime-orchestrator.js';

const repoRoot = process.cwd();
const templatesRoot = path.join(repoRoot, 'src/ToolNexus.Web/wwwroot/tool-templates');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tools.manifest.json'), 'utf8'));

const toolSlugs = manifest.tools.map((tool) => tool.slug);

function readTemplate(slug) {
  return fs.readFileSync(path.join(templatesRoot, `${slug}.html`), 'utf8');
}

describe('runtime orchestrator observation mode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test.each(toolSlugs)('%s generates observation profile and root attributes after mount', (slug) => {
    const host = document.createElement('div');
    host.setAttribute('data-tool-root', '');
    host.innerHTML = readTemplate(slug);
    document.body.appendChild(host);

    const runtimeRoot = host.querySelector('[data-tool-shell]') ?? host.firstElementChild ?? host;
    const beforeChildren = runtimeRoot.childElementCount;
    const beforeMarkup = runtimeRoot.innerHTML;

    const events = [];
    const result = applyAiRuntimeOrchestrator(runtimeRoot, {
      toolSlug: slug,
      emitTelemetry: (eventName, payload) => events.push({ eventName, payload })
    });

    expect(result.genomeProfile.genome).toBeTruthy();
    expect(result.mode).toMatch(/^(simple|workspace|advanced)$/);
    expect(result.complexity).toMatch(/^(low|medium|high)$/);

    expect(runtimeRoot.getAttribute('data-tool-genome')).toBe(result.genomeProfile.genome);
    expect(runtimeRoot.getAttribute('data-orchestrator-mode')).toBe(result.mode);
    expect(runtimeRoot.getAttribute('data-orchestrator-complexity')).toBe(result.complexity);

    expect(runtimeRoot.childElementCount).toBe(beforeChildren);
    expect(runtimeRoot.innerHTML).toBe(beforeMarkup);

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventName: 'runtime_orchestrator_observation_created',
        payload: expect.objectContaining({
          toolSlug: slug,
          mode: result.mode,
          complexity: result.complexity
        })
      }),
      expect.objectContaining({
        eventName: 'runtime_strategy_selected',
        payload: expect.objectContaining({
          toolSlug: slug,
          mode: result.mode,
          genome: result.genomeProfile.genome
        })
      })
    ]));
  });
});
