/** @jest-environment jsdom */

import {
  createExecutionContext,
  defineTool,
  executeTool,
  registerTool,
  unregisterTool
} from '../../../src/ToolNexus.Web/wwwroot/js/runtime-sdk/tool-sdk.js';

describe('runtime-sdk', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="tool-root">
        <textarea data-tool-input>hello</textarea>
        <textarea data-tool-output></textarea>
        <span data-tool-status></span>
      </section>
    `;
  });

  afterEach(() => {
    unregisterTool('example-sdk-tool');
  });

  test('defineTool normalizes run hook as onRun', async () => {
    const tool = defineTool({
      id: 'example-sdk-tool',
      run(input) {
        return String(input).toUpperCase();
      }
    });

    expect(tool.id).toBe('example-sdk-tool');
    await expect(tool.onRun('abc')).resolves.toBe('ABC');
  });

  test('executeTool reads input and writes output/status through anchors', async () => {
    const root = document.getElementById('tool-root');
    registerTool({
      id: 'example-sdk-tool',
      onRun(input) {
        return `done:${input}`;
      }
    }, { root });

    await expect(executeTool('example-sdk-tool', { root })).resolves.toBe('done:hello');

    expect(root.querySelector('[data-tool-output]').value).toBe('done:hello');
    expect(root.querySelector('[data-tool-status]').dataset.toolStatus).toBe('success');
  });

  test('execution errors are surfaced and reflected in status/output', async () => {
    const root = document.getElementById('tool-root');
    registerTool({
      id: 'example-sdk-tool',
      onRun() {
        throw new Error('boom');
      }
    }, { root });

    await expect(executeTool('example-sdk-tool', { root })).rejects.toThrow('boom');

    expect(root.querySelector('[data-tool-status]').dataset.toolStatus).toBe('error');
    expect(root.querySelector('[data-tool-output]').value).toContain('boom');
  });

  test('createExecutionContext exposes runtime anchor helpers', () => {
    const root = document.getElementById('tool-root');
    const context = createExecutionContext({ root });

    context.setStatus('idle');
    context.setOutput('abc');

    expect(context.getInput()).toBe('hello');
    expect(root.querySelector('[data-tool-output]').value).toBe('abc');
    expect(root.querySelector('[data-tool-status]').textContent).toBe('idle');
  });
});
