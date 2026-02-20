function toCandidates(module) {
  return [
    module,
    module?.default,
    module?.lifecycle,
    module?.default?.lifecycle,
    typeof module === 'function' ? { mount: module } : null,
    typeof module?.default === 'function' ? { mount: module.default } : null
  ].filter(Boolean);
}

async function invokeFirst(candidates, methods, ...args) {
  for (const candidate of candidates) {
    for (const method of methods) {
      if (typeof candidate?.[method] === 'function') {
        const value = await candidate[method](...args);
        return { invoked: true, candidate, method, value };
      }
    }
  }

  return { invoked: false, candidate: null, method: null, value: undefined };
}

function buildCleanup(candidate, context, root, manifest) {
  if (!candidate) {
    return undefined;
  }

  const teardownMethod = ['destroy', 'dispose', 'unmount'].find((method) => typeof candidate?.[method] === 'function');
  if (!teardownMethod) {
    return undefined;
  }

  return async () => {
    await candidate[teardownMethod](context, root, manifest);
  };
}

export function inspectLifecycleContract(module) {
  const candidates = toCandidates(module);

  const compliant = candidates.some((candidate) =>
    ['create', 'init', 'destroy', 'runTool'].every((method) => typeof candidate?.[method] === 'function'));

  return {
    compliant,
    candidates: candidates.length,
    supportsMount: candidates.some((candidate) => typeof candidate?.mount === 'function'),
    supportsCreateInit: candidates.some((candidate) =>
      typeof candidate?.create === 'function' && typeof candidate?.init === 'function')
  };
}

async function tryLegacyFallback({ slug, root, manifest }) {
  const globalResult = await invokeFirst([window], ['runTool', 'init'], root, manifest);
  if (globalResult.invoked) {
    return { mounted: true, cleanup: undefined, mode: 'window.global' };
  }

  const legacyModule = window.ToolNexusModules?.[slug];
  if (!legacyModule) {
    return { mounted: false, cleanup: undefined, mode: 'none' };
  }

  const mountResult = await invokeFirst([legacyModule], ['mount', 'runTool', 'init'], root, manifest);
  if (mountResult.invoked) {
    return {
      mounted: true,
      cleanup: buildCleanup(mountResult.candidate, mountResult.value, root, manifest),
      mode: 'window.ToolNexusModules'
    };
  }

  const createResult = await invokeFirst([legacyModule], ['create'], { slug, root, manifest });
  if (createResult.invoked) {
    await invokeFirst([legacyModule], ['init'], root, manifest);
    return {
      mounted: true,
      cleanup: buildCleanup(legacyModule, createResult.value, root, manifest),
      mode: 'window.ToolNexusModules.create-init'
    };
  }

  return { mounted: false, cleanup: undefined, mode: 'none' };
}

export async function mountToolLifecycle({ module, slug, root, manifest }) {
  const moduleCandidates = toCandidates(module);

  const mountResult = await invokeFirst(moduleCandidates, ['mount'], root, manifest);
  if (mountResult.invoked) {
    return {
      mounted: true,
      cleanup: buildCleanup(mountResult.candidate, mountResult.value, root, manifest),
      mode: 'module.mount'
    };
  }

  const createResult = await invokeFirst(moduleCandidates, ['create'], { slug, root, manifest });
  if (createResult.invoked) {
    await invokeFirst(moduleCandidates, ['init'], root, manifest);
    return {
      mounted: true,
      cleanup: buildCleanup(createResult.candidate, createResult.value, root, manifest),
      mode: 'module.create-init'
    };
  }

  const legacyInitResult = await invokeFirst(moduleCandidates, ['init', 'runTool'], root, manifest);
  if (legacyInitResult.invoked) {
    return {
      mounted: true,
      cleanup: buildCleanup(legacyInitResult.candidate, legacyInitResult.value, root, manifest),
      mode: 'module.legacy-init'
    };
  }

  if (typeof window.ToolNexusKernel?.create === 'function') {
    const kernelContext = await window.ToolNexusKernel.create({ slug, root, manifest, module });
    if (typeof window.ToolNexusKernel?.init === 'function') {
      await window.ToolNexusKernel.init(kernelContext ?? { slug, root, manifest, module });
    }

    return { mounted: true, cleanup: undefined, mode: 'kernel.create-init' };
  }

  if (typeof window.ToolNexusKernel?.initialize === 'function') {
    await window.ToolNexusKernel.initialize({ slug, root, manifest, module });
    return { mounted: true, cleanup: undefined, mode: 'kernel.initialize' };
  }

  return tryLegacyFallback({ slug, root, manifest });
}

export async function legacyAutoInit({ slug, root, manifest }) {
  const result = await tryLegacyFallback({ slug, root, manifest });
  return {
    mounted: result.mounted,
    cleanup: result.cleanup,
    mode: result.mounted ? 'legacy.auto-init' : 'none'
  };
}
