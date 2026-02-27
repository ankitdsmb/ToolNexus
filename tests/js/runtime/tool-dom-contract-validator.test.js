import { validateToolDom } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

describe('tool DOM contract validator', () => {
  test('returns missing canonical semantic nodes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<section class="tool-page"></section>';

    const result = validateToolDom(root);

    expect(result.isValid).toBe(false);
    expect(result.missingNodes).toContain('data-tool-shell');
    expect(result.missingNodes).toContain('data-tool-output');
    expect(result.detectedLayoutType).toBe('LEGACY_LAYOUT');
  });

  test('passes when canonical contract nodes are present', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-tool-shell="true">
        <header data-tool-context="true"></header>
        <section data-tool-input="true"></section>
        <section data-tool-status="true"></section>
        <section data-tool-output="true"></section>
        <footer data-tool-followup="true"></footer>
      </section>
    `;

    const result = validateToolDom(root);

    expect(result.isValid).toBe(true);
    expect(result.missingNodes).toEqual([]);
    expect(result.detectedLayoutType).toBe('MODERN_LAYOUT');
  });
});
