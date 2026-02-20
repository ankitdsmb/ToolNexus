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
        await candidate[method](...args);
        return true;
      }
    }
  }

  return false;
}

async function tryLegacyFallback({ slug, root, manifest }) {
  if (await invokeFirst([window], ['runTool', 'init'], root, manifest)) {
    return true;
  }

  const legacyModule = window.ToolNexusModules?.[slug];
  if (!legacyModule) {
    return false;
  }

  if (await invokeFirst([legacyModule], ['mount', 'runTool', 'init'], root, manifest)) {
    return true;
  }

  if (await invokeFirst([legacyModule], ['create'], { slug, root, manifest })) {
    await invokeFirst([legacyModule], ['init'], root, manifest);
    return true;
  }

  return false;
}

export async function mountToolLifecycle({ module, slug, root, manifest }) {
  const moduleCandidates = toCandidates(module);

  if (await invokeFirst(moduleCandidates, ['mount'], root, manifest)) {
    return { mounted: true, mode: 'module.mount' };
  }

  if (await invokeFirst(moduleCandidates, ['create'], { slug, root, manifest })) {
    await invokeFirst(moduleCandidates, ['init'], root, manifest);
    return { mounted: true, mode: 'module.create-init' };
  }

  if (await invokeFirst(moduleCandidates, ['init', 'runTool'], root, manifest)) {
    return { mounted: true, mode: 'module.legacy-init' };
  }

  if (typeof window.ToolNexusKernel?.create === 'function') {
    const kernelContext = await window.ToolNexusKernel.create({ slug, root, manifest, module });
    if (typeof window.ToolNexusKernel?.init === 'function') {
      await window.ToolNexusKernel.init(kernelContext ?? { slug, root, manifest, module });
    }

    return { mounted: true, mode: 'kernel.create-init' };
  }

  if (typeof window.ToolNexusKernel?.initialize === 'function') {
    await window.ToolNexusKernel.initialize({ slug, root, manifest, module });
    return { mounted: true, mode: 'kernel.initialize' };
  }

  if (await tryLegacyFallback({ slug, root, manifest })) {
    return { mounted: true, mode: 'window.ToolNexusModules' };
  }

  return { mounted: false, mode: 'none' };
}

export async function legacyAutoInit({ slug, root, manifest }) {
  const mounted = await tryLegacyFallback({ slug, root, manifest });
  return { mounted, mode: mounted ? 'legacy.auto-init' : 'none' };
}
