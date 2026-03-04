import { defineTool } from '../tool-sdk.js';

export const exampleTool = defineTool({
  id: 'example-tool',
  name: 'Example Tool',
  description: 'Uppercases input to demonstrate the runtime SDK flow.',
  permissions: ['dom'],
  onRun(input) {
    return String(input ?? '').toUpperCase();
  }
});
