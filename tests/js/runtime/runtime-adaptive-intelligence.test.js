import { applyAiRuntimeOrchestrator } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/orchestrator/ai-runtime-orchestrator.js';

function buildRoot(markup = '') {
  const host = document.createElement('div');
  host.innerHTML = `
    <section data-tool-shell="true">
      <header data-tool-context="true"></header>
      <div data-tool-status="true"></div>
      <section data-tool-content-host="true">${markup}</section>
      <footer data-tool-followup="true"></footer>
    </section>
  `;

  const root = host.querySelector('[data-tool-shell]');
  document.body.appendChild(root);
  return root;
}

describe('runtime adaptive execution intelligence', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test.each([
    {
      scenario: 'simple mode gets compact runtime classes',
      markup: '<textarea id="singleEditor"></textarea>',
      expectedMode: 'simple',
      expectedClasses: ['runtime-mode-simple', 'density-profile-compact']
    },
    {
      scenario: 'workspace mode gets balanced runtime classes',
      markup: `
        <div class="tool-local-actions">
          <button data-action="format">Format</button>
          <button data-action="validate">Validate</button>
        </div>
        <textarea id="leftEditor"></textarea>
        <textarea id="rightEditor"></textarea>
      `,
      expectedMode: 'workspace',
      expectedClasses: ['runtime-mode-workspace', 'density-profile-balanced']
    },
    {
      scenario: 'advanced mode gets pipeline runtime classes',
      markup: `
        <div class="tool-local-actions">
          <button data-action="a1">A1</button>
          <button data-action="a2">A2</button>
          <button data-action="a3">A3</button>
          <button data-action="a4">A4</button>
          <button data-action="a5">A5</button>
          <button data-action="a6">A6</button>
          <button data-action="a7">A7</button>
          <button data-action="a8">A8</button>
        </div>
        <textarea id="pipelineEditorA"></textarea>
        <textarea id="pipelineEditorB"></textarea>
      `,
      expectedMode: 'advanced',
      expectedClasses: ['runtime-mode-pipeline', 'density-profile-expanded']
    }
  ])('$scenario', ({ markup, expectedMode, expectedClasses }) => {
    const root = buildRoot(markup);
    const contextAnchor = root.querySelector('[data-tool-context]');
    const statusAnchor = root.querySelector('[data-tool-status]');
    const followupAnchor = root.querySelector('[data-tool-followup]');
    const beforeMarkup = root.innerHTML;
    const events = [];

    const result = applyAiRuntimeOrchestrator(root, {
      toolSlug: 'adaptive-test',
      emitTelemetry: (eventName, payload) => events.push({ eventName, payload })
    });

    expect(result.mode).toBe(expectedMode);
    expect(result.appliedRuntimeClasses).toEqual(expectedClasses);
    expect(root.classList.contains(expectedClasses[0])).toBe(true);
    expect(root.classList.contains(expectedClasses[1])).toBe(true);

    expect(root.innerHTML).toBe(beforeMarkup);
    expect(root.querySelector('[data-tool-context]')).toBe(contextAnchor);
    expect(root.querySelector('[data-tool-status]')).toBe(statusAnchor);
    expect(root.querySelector('[data-tool-followup]')).toBe(followupAnchor);

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventName: 'runtime_orchestrator_observation_created' }),
      expect.objectContaining({
        eventName: 'runtime_strategy_selected',
        payload: expect.objectContaining({
          genome: result.genomeProfile.genome,
          mode: expectedMode,
          appliedRuntimeClasses: expectedClasses,
          strategy: expect.objectContaining({
            spacingProfile: expect.any(String),
            toolbarPriority: expect.any(String),
            editorBalanceMode: expect.any(String)
          })
        })
      })
    ]));
  });
});
