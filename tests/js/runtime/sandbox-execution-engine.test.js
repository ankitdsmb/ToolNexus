import { createSandboxExecutionEngine } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/sandbox/sandbox-execution-engine.js';

describe('sandbox execution engine', () => {
  test('trusted internal tools bypass sandbox', async () => {
    const engine = createSandboxExecutionEngine({ preferWorker: false });

    const tool = {
      isTrustedInternal: true,
      run: async (input) => ({ echoed: input })
    };

    await expect(engine.execute({ tool, input: { value: 42 } })).resolves.toEqual({
      mode: 'trusted',
      result: { echoed: { value: 42 } }
    });

    engine.dispose();
  });

  test('community tools require source code payload', async () => {
    const engine = createSandboxExecutionEngine({ preferWorker: false });

    await expect(engine.execute({ tool: { isTrustedInternal: false }, input: {} })).rejects.toThrow(
      'Community sandbox execution requires a string source payload.'
    );

    engine.dispose();
  });

  test('falls back to iframe sandbox when worker is disabled', () => {
    const engine = createSandboxExecutionEngine({ preferWorker: false });
    const selection = engine.resolveSandbox({ isTrustedInternal: false });

    expect(selection.mode).toBe('iframe');

    engine.dispose();
  });
});
