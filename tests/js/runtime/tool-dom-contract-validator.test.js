import { validateToolDomContract } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

describe('tool DOM contract validator', () => {
  test('returns all missing selectors and attributes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<section class="tool-page"></section>';

    const result = validateToolDomContract(root, 'json-formatter');

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe('[DOM CONTRACT ERROR]');
    expect(result.errors).toContain('Missing selector: .tool-layout');
    expect(result.errors).toContain('Missing selector: #outputField');
    expect(result.errors).toContain('Missing attribute data-slug on .tool-page');
  });

  test('passes when all contracts are present', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section class="tool-page" data-slug="json-formatter">
        <div class="tool-layout">
          <section class="tool-layout__panel">
            <textarea id="inputEditor"></textarea>
          </section>
          <section class="tool-panel--output">
            <textarea id="outputField"></textarea>
          </section>
        </div>
      </section>
    `;

    const result = validateToolDomContract(root, 'json-formatter');

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
