import { describe, expect, test } from 'vitest';
import { legacyExecuteTool } from '../../src/ToolNexus.Web/wwwroot/js/runtime/legacy-execution-bridge.js';

describe('legacy bridge compatibility', () => {
  test('returns mounted=true when legacy module init inserts content', async () => {
    const root = document.createElement('div');
    const result = await legacyExecuteTool({
      slug: 'legacy-module',
      root,
      module: {
        init: (node) => {
          node.innerHTML = '<div data-legacy-mounted="true"></div>';
        }
      }
    });

    expect(result.mounted).toBe(true);
    expect(root.querySelector('[data-legacy-mounted="true"]')).not.toBeNull();
  });
});
