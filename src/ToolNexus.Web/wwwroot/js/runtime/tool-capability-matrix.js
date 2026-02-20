function hasLifecycleContract(candidate) {
  return ['create', 'init', 'destroy'].every((method) => typeof candidate?.[method] === 'function')
    || typeof candidate?.mount === 'function';
}

function toCandidates(module) {
  return [
    module,
    module?.default,
    module?.lifecycle,
    module?.default?.lifecycle
  ].filter(Boolean);
}

export function detectToolCapabilities({ slug, module, manifest, root } = {}) {
  const candidates = toCandidates(module);
  const legacyGlobalModule = window.ToolNexusModules?.[slug];
  const hasLegacyGlobalInit =
    typeof window.runTool === 'function'
    || typeof window.init === 'function'
    || ['init', 'runTool', 'mount'].some((method) => typeof legacyGlobalModule?.[method] === 'function');

  const needsDOMReady = Boolean(
    manifest?.needsDOMReady
    || module?.needsDOMReady
    || module?.default?.needsDOMReady
    || hasLegacyGlobalInit
  );

  const hasTemplate = Boolean(manifest?.templatePath || root?.children?.length);
  const dependencies = Array.isArray(manifest?.dependencies) ? manifest.dependencies.filter(Boolean) : [];

  return {
    slug: slug ?? manifest?.slug ?? root?.dataset?.toolSlug ?? '',
    hasManifest: Boolean(manifest),
    hasLifecycle: candidates.some(hasLifecycleContract),
    hasRunTool: candidates.some((candidate) => typeof candidate?.runTool === 'function')
      || typeof legacyGlobalModule?.runTool === 'function'
      || typeof window.runTool === 'function',
    hasLegacyGlobalInit,
    needsDOMReady,
    hasTemplate,
    hasDependencies: dependencies.length > 0,
    mountMode: needsDOMReady || hasLegacyGlobalInit ? 'legacy' : (hasTemplate ? 'enhance' : 'replace')
  };
}
