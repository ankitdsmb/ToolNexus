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
        return method;
      }
    }
  }

  return null;
}

export function simulateDomReadyForLegacyTool({ slug, root }) {
  const domReadyEvent = new Event('DOMContentLoaded', { bubbles: true, cancelable: true });
  document.dispatchEvent(domReadyEvent);

  if (!root?.firstElementChild) {
    window.dispatchEvent(new CustomEvent('toolnexus:legacy-dom-ready', {
      detail: { slug }
    }));
  }
}

async function bootWindowRegistryModule({ slug, root, manifest }) {
  const registryModule = window.ToolNexusModules?.[slug];
  if (!registryModule) {
    return null;
  }

  const directMethod = await invokeFirst([registryModule], ['init', 'runTool', 'mount'], root, manifest);
  if (directMethod) {
    return `window.ToolNexusModules.${directMethod}`;
  }

  const createdMethod = await invokeFirst([registryModule], ['create'], { slug, root, manifest });
  if (createdMethod) {
    await invokeFirst([registryModule], ['init'], root, manifest);
    return 'window.ToolNexusModules.create-init';
  }

  return null;
}

export async function bootstrapLegacyTool({
  module,
  slug,
  root,
  manifest,
  modulePath,
  importModule = (path) => import(path),
  logger = console
} = {}) {
  let workingModule = module;

  if (!workingModule && modulePath) {
    try {
      workingModule = await importModule(modulePath);
    } catch (error) {
      logger?.warn?.(`legacy-tool-bootstrap: failed to import module for "${slug}".`, error);
    }
  }

  const candidates = toCandidates(workingModule);

  const lifecycleMethod = await invokeFirst(candidates, ['create'], { slug, root, manifest });
  if (lifecycleMethod) {
    await invokeFirst(candidates, ['init'], root, manifest);
    return { mounted: Boolean(root?.firstElementChild), mode: `module.${lifecycleMethod}-init` };
  }

  const initMethod = await invokeFirst(candidates, ['init'], root, manifest);
  if (initMethod) {
    return { mounted: Boolean(root?.firstElementChild), mode: `module.${initMethod}` };
  }

  const runToolMethod = await invokeFirst(candidates, ['runTool'], root, manifest);
  if (runToolMethod) {
    return { mounted: Boolean(root?.firstElementChild), mode: `module.${runToolMethod}` };
  }

  const windowMethod = await invokeFirst([window], ['runTool', 'init'], root, manifest);
  if (windowMethod) {
    return { mounted: Boolean(root?.firstElementChild), mode: `window.${windowMethod}` };
  }

  const registryMode = await bootWindowRegistryModule({ slug, root, manifest });
  if (registryMode) {
    return { mounted: Boolean(root?.firstElementChild), mode: registryMode };
  }

  simulateDomReadyForLegacyTool({ slug, root });

  if (!root?.firstElementChild) {
    const retriedMode = await bootWindowRegistryModule({ slug, root, manifest });
    if (retriedMode) {
      return { mounted: Boolean(root?.firstElementChild), mode: `${retriedMode}-after-dom-ready` };
    }
  }

  return { mounted: Boolean(root?.firstElementChild), mode: 'legacy.dom-ready-simulation' };
}
