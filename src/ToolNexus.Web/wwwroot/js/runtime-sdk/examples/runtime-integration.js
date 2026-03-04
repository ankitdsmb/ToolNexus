import { executeTool, registerTool } from '../tool-sdk.js';
import { exampleTool } from './example-tool.js';

export function mountExampleToolRuntime(root) {
  const tool = registerTool(exampleTool, { root });

  const runTrigger = root.querySelector('[data-tool-run]');
  if (runTrigger) {
    runTrigger.addEventListener('click', async () => {
      await executeTool(tool.id, { root });
    });
  }

  return tool;
}
