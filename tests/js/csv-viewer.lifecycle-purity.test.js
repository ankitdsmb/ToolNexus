import { runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/csv-viewer.js';

describe('csv-viewer lifecycle purity guard', () => {
  beforeEach(() => {
    window.ToolNexusLogging = { runtimeDebugEnabled: true };
    document.body.innerHTML = `
      <article class="tool-page" data-slug="csv-viewer">
        <div class="tool-layout__panel"></div>
        <section class="tool-panel--output"></section>
        <div id="outputField"></div>
        <textarea id="inputEditor"></textarea>
      </article>
    `;
  });

  afterEach(() => {
    delete window.ToolNexusLogging;
    document.body.innerHTML = '';
  });

  test('throws if mount payload reaches runTool', async () => {
    await expect(runTool({ root: document.createElement('div') }, 'a,b\n1,2')).rejects.toThrow(
      '[csv-viewer] runTool cannot be called during mount lifecycle.'
    );
  });
});
