function toCandidates(module) {
  return [
    module,
    module?.default,
    module?.lifecycle,
    module?.default?.lifecycle
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
