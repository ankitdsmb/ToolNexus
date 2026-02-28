import { validateExecutionUiLaw } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/execution-ui-law-validator.js';

describe('execution ui law validator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('passes compliant runtime widget structure', () => {
    document.body.innerHTML = `
      <div data-tool-shell="true">
        <div data-tool-status="true">READY</div>
        <section class="tool-runtime-widget" style="gap: 8px;">
          <header class="tool-local-header"></header>
          <div class="tool-local-actions" style="height: 44px;">
            <button class="tn-btn--primary" data-tool-action="execute">Run</button>
          </div>
          <div class="tool-local-body">
            <textarea style="height: 320px;"></textarea>
            <textarea style="height: 320px;"></textarea>
          </div>
          <aside class="tool-local-metrics"></aside>
        </section>
      </div>
    `;

    const result = validateExecutionUiLaw(document.body);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.score).toBe(100);
  });

  test('reports violations but does not block loading path', () => {
    document.body.innerHTML = `
      <div data-tool-shell="true">
        <div data-tool-status="true" hidden>READY</div>
        <section class="tool-runtime-widget" style="gap: 28px;">
          <div class="tool-local-actions" style="height: 96px;">
            <button class="tn-btn--primary">Run</button>
            <button class="tn-btn--primary">Duplicate</button>
          </div>
          <div class="tool-local-body">
            <textarea style="height: 240px;"></textarea>
            <textarea style="height: 460px;"></textarea>
          </div>
          <section class="tool-runtime-widget"></section>
        </section>
      </div>
    `;

    const result = validateExecutionUiLaw(document.body);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.ruleId === 'RULE_4')).toBe(true);
    expect(result.violations.some((v) => v.ruleId === 'RULE_5')).toBe(true);
    expect(result.violations.some((v) => v.ruleId === 'RULE_6')).toBe(true);
    expect(result.violations.some((v) => v.ruleId === 'RULE_9')).toBe(true);
  });
});
