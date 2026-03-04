import { createIframeToolSandbox, createTrustedToolRuntime, createWorkerToolSandbox } from './tool-sandbox.js';

function defaultTrustResolver(tool) {
  return tool?.isTrustedInternal === true || tool?.trustLevel === 'internal';
}

export function createSandboxExecutionEngine({
  container = null,
  preferWorker = true,
  timeoutMs = 8000,
  trustResolver = defaultTrustResolver
} = {}) {
  const trustedRuntime = createTrustedToolRuntime();
  const workerSandbox = preferWorker && typeof Worker !== 'undefined'
    ? createWorkerToolSandbox({ timeoutMs })
    : null;
  const iframeSandbox = createIframeToolSandbox({ container, timeoutMs });

  function resolveSandbox(tool) {
    if (typeof trustResolver === 'function' && trustResolver(tool)) {
      return { mode: 'trusted', runtime: trustedRuntime };
    }

    if (workerSandbox) {
      return { mode: 'worker', runtime: workerSandbox };
    }

    return { mode: 'iframe', runtime: iframeSandbox };
  }

  async function execute({ tool, input }) {
    const selected = resolveSandbox(tool);

    if (selected.mode === 'trusted') {
      const result = await selected.runtime.execute(tool, input);
      return { mode: selected.mode, result };
    }

    if (typeof tool?.source !== 'string' || !tool.source.trim()) {
      throw new Error('Community sandbox execution requires a string source payload.');
    }

    const result = await selected.runtime.execute(tool.source, input);

    return {
      mode: selected.mode,
      result,
      pipeline: 'runtime → sandbox → tool runtime → result'
    };
  }

  function dispose() {
    workerSandbox?.dispose();
    iframeSandbox?.dispose();
    trustedRuntime.dispose();
  }

  return {
    execute,
    dispose,
    resolveSandbox
  };
}
