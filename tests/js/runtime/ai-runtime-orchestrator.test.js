import { analyzeToolGenome } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/tool-genome-analyzer.js';
import { applyAiRuntimeOrchestrator } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/ai-runtime-orchestrator.js';
import { evaluateRuntimeGovernance } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/runtime-governance-engine.js';

describe('ai runtime orchestrator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('genome detection captures editors, action density, and workflow', () => {
    document.body.innerHTML = `
      <div data-tool-shell>
        <div class="tool-local-actions">
          <button data-action="run">Run</button>
          <button data-action="format">Format</button>
          <button data-action="validate">Validate</button>
        </div>
        <textarea></textarea>
        <textarea></textarea>
      </div>
    `;

    const root = document.querySelector('[data-tool-shell]');
    const genome = analyzeToolGenome(root);

    expect(genome.editorCount).toBe(2);
    expect(genome.actionCount).toBe(3);
    expect(genome.actionDensityBand).toBe('medium');
    expect(genome.workflowType).toBe('transform');
  });

  test('mode decision applies passive orchestrator attributes and telemetry', () => {
    document.body.innerHTML = `
      <div data-tool-shell>
        <div class="tool-local-actions">
          <button data-action="run">Run</button>
        </div>
        <textarea></textarea>
      </div>
    `;

    const root = document.querySelector('[data-tool-shell]');
    const events = [];
    const result = applyAiRuntimeOrchestrator(root, {
      toolSlug: 'json-formatter',
      emitTelemetry: (eventName, payload) => events.push({ eventName, payload })
    });

    expect(result.mode).toMatch(/^(simple|workspace|advanced)$/);
    expect(root.getAttribute('data-tool-genome')).toContain('single-step');
    expect(root.getAttribute('data-orchestrator-mode')).toBe(result.mode);
    expect(root.getAttribute('data-orchestrator-complexity')).toBe(result.complexity);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventName: 'runtime_orchestrator_observation_created',
        payload: expect.objectContaining({
          toolSlug: 'json-formatter',
          mode: result.mode
        })
      }),
      expect.objectContaining({
        eventName: 'runtime_strategy_selected',
        payload: expect.objectContaining({
          toolSlug: 'json-formatter',
          mode: result.mode,
          appliedRuntimeClasses: expect.any(Array)
        })
      })
    ]));
  });

  test('governance warnings flag overload and density/layout risk', () => {
    const governance = evaluateRuntimeGovernance({
      genomeProfile: {
        actionCount: 10,
        actionDensity: 3.1
      },
      behaviorProfile: {
        complexityScore: 6.4
      }
    });

    expect(governance.actionOverload).toBe(true);
    expect(governance.densityRisk).toBe(true);
    expect(governance.layoutRisk).toBe(true);
    expect(governance.riskLevel).toBe('high');
    expect(governance.warnings).toEqual(expect.arrayContaining([
      'action_overload',
      'density_risk',
      'layout_risk'
    ]));
  });
});
