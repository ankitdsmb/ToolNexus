import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

describe('tool DOM contract validator', () => {
  test('returns missing canonical semantic nodes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<section class="tool-page"></section>';

    const result = validateToolDom(root);

    expect(result.isValid).toBe(false);
    expect(result.missingNodes).toContain('data-tool-root');
    expect(result.missingNodes).toContain('data-tool-output');
    expect(result.detectedLayoutType).toBe('LEGACY_LAYOUT');
  });

  test('passes when canonical contract nodes are present', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-runtime-container="true"><section data-tool-root="true">
        <header data-tool-header="true"></header>
        <div data-tool-body="true">
          <section data-tool-input="true"></section>
          <section data-tool-output="true"></section>
          <div data-tool-actions="true"></div>
        </div>
      </section></section>
    `;

    const result = validateToolDom(root);

    expect(result.isValid).toBe(true);
    expect(result.missingNodes).toEqual([]);
    expect(result.detectedLayoutType).toBe('MODERN_LAYOUT');
    expect(result.missingNodes).not.toContain('data-runtime-container');
  });
});
