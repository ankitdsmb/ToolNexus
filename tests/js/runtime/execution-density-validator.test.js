import fs from 'node:fs';
import path from 'node:path';

import { validateExecutionDensity, writeExecutionDensityReport } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/execution-density-validator.js';

describe('execution density validator', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('compact layout pass', () => {
    document.body.innerHTML = `
      <div data-tool-shell style="padding: 16px;">
        <header data-tool-header style="height: 80px;"></header>
        <div data-tool-status style="height: 44px; opacity: 1;">READY</div>
        <section class="tool-runtime-widget" style="display:grid; gap: 12px;">
          <div class="tool-local-actions" style="height: 40px; margin-bottom: 12px; opacity:1;">
            <button class="tool-btn--primary">Run</button>
          </div>
          <div class="tool-local-body" style="display:grid; gap: 8px;">
            <textarea style="height: 320px; opacity:1;"></textarea>
            <textarea style="height: 326px;"></textarea>
          </div>
        </section>
        <aside data-tool-docs style="opacity:0.65;">docs</aside>
      </div>
    `;

    const result = validateExecutionDensity(document.body);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.telemetryCategory).toBe('density_drift');
    expect(result.violations).toHaveLength(0);
  });

  test('oversized spacing fail', () => {
    document.body.innerHTML = `
      <div data-tool-shell style="padding: 16px;">
        <header data-tool-header style="height: 60px;"></header>
        <div data-tool-status style="height: 40px; opacity: 1;">READY</div>
        <section class="tool-runtime-widget" style="display:grid; gap: 36px;">
          <div class="tool-local-actions" style="margin-bottom: 32px;"><button class="tool-btn--primary">Run</button></div>
          <textarea style="height:320px;"></textarea>
        </section>
      </div>
    `;

    const result = validateExecutionDensity(document.body);
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === 'D1')).toBe(true);
    expect(result.violations.some((item) => item.ruleId === 'D3')).toBe(true);
  });

  test('dual editor mismatch fail', () => {
    document.body.innerHTML = `
      <div data-tool-shell style="padding: 18px;">
        <header data-tool-header style="height: 72px;"></header>
        <div data-tool-status style="height: 44px; opacity:1;">READY</div>
        <section class="tool-runtime-widget" style="display:grid; gap: 10px;">
          <div class="tool-local-actions"><button class="tool-btn--primary">Run</button></div>
          <div class="tool-local-body">
            <textarea style="height: 280px;"></textarea>
            <textarea style="height: 340px;"></textarea>
          </div>
        </section>
      </div>
    `;

    const result = validateExecutionDensity(document.body);
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === 'D4')).toBe(true);
  });

  test('nested surface fail', async () => {
    document.body.innerHTML = `
      <div data-tool-shell style="padding: 24px;">
        <header data-tool-header style="height: 200px;"></header>
        <div data-tool-status style="height: 60px; opacity:1;">READY</div>
        <section class="tool-runtime-widget panel" style="display:grid; gap: 10px;">
          <div class="tool-local-actions"><button class="tool-btn--primary">Run</button></div>
          <div class="panel">
            <div class="card">
              <div class="surface">
                <textarea style="height:300px;"></textarea>
              </div>
            </div>
          </div>
        </section>
        <aside data-tool-docs style="opacity:1;">docs</aside>
      </div>
    `;

    const result = validateExecutionDensity(document.body);
    expect(result.passed).toBe(false);
    expect(result.violations.some((item) => item.ruleId === 'D2')).toBe(true);
    expect(result.violations.some((item) => item.ruleId === 'D6')).toBe(true);
    expect(result.violations.some((item) => item.ruleId === 'D7')).toBe(true);
    expect(result.violations.some((item) => item.ruleId === 'D8')).toBe(true);
    expect(result.violations.some((item) => item.ruleId === 'D9')).toBe(true);

    const reportPath = path.resolve(process.cwd(), 'reports/execution-density-report.json');
    await writeExecutionDensityReport({ sample: true, ...result });
    expect(fs.existsSync(reportPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.score).toBe(result.score);
    expect(report.sample).toBe(true);
  });
});
