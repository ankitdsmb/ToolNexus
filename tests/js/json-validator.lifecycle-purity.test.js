import { runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-validator.js';

describe('json-validator lifecycle purity guard', () => {
  beforeEach(() => {
    window.ToolNexusLogging = { runtimeDebugEnabled: true };
  });

  afterEach(() => {
    delete window.ToolNexusLogging;
  });

  test('throws if mount payload reaches runTool', async () => {
    await expect(runTool({ root: document.createElement('div') }, '{"ok":true}')).rejects.toThrow(
      '[json-validator] runTool cannot be called during mount lifecycle.'
    );
  });
});
