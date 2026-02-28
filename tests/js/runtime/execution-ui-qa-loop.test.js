import fs from 'node:fs';
import path from 'node:path';
import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';
import { validateExecutionUiLaw } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/execution-ui-law-validator.js';

const manifestPath = path.resolve(process.cwd(), 'tools.manifest.json');
const templatesRoot = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/tool-templates');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const tools = manifest.tools ?? [];

function shellScaffold() {
  return `
    <div data-tool-shell="true">
      <div data-tool-context="true"></div>
      <div data-tool-input="true"></div>
      <div data-tool-status="true">READY</div>
      <div data-tool-output="true"></div>
      <div data-tool-followup="true"></div>
      <div data-tool-content-host="true"></div>
    </div>
  `;
}

describe('execution ui automated qa loop', () => {
  beforeEach(() => {
    document.body.innerHTML = shellScaffold();
  });

  test.each(tools.map((tool) => [tool.slug]))('%s runtime mount passes DOM + UI law + interaction stability checks', (slug) => {
    const host = document.querySelector('[data-tool-content-host]');
    const templatePath = path.join(templatesRoot, `${slug}.html`);
    const template = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf8') : '';
    host.innerHTML = template;

    const domResult = validateToolDom(document.body);
    expect(domResult.isValid).toBe(true);

    const uiResult = validateExecutionUiLaw(document.body);
    expect(uiResult.violations.filter((v) => v.severity === 'critical')).toHaveLength(0);

    const widget = host.querySelector('.tool-runtime-widget');
    if (widget) {
      const beforeChildren = widget.childElementCount;
      const actionable = widget.querySelector('[data-tool-action="execute"], [data-tool-execute], #executeBtn, button');
      actionable?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      actionable?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      actionable?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

      const afterChildren = widget.childElementCount;
      expect(afterChildren).toBe(beforeChildren);
      expect(widget.querySelectorAll('.tool-runtime-widget .tool-runtime-widget').length).toBe(0);
    }
  });
});
