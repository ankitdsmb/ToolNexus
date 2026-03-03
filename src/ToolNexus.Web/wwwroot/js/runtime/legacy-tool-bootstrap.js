import { createRuntimeMigrationLogger } from './runtime-migration-logger.js';
import { validateRuntimeModulePath } from './runtime-import-integrity.js';

function getImportIntegrityMode() {
  const mode = String(window.ToolNexusConfig?.importIntegrityMode ?? 'warn').trim().toLowerCase();
  if (mode === 'enforce-dev' || mode === 'enforce-strict') {
    return mode;
  }

  return 'warn';
}

function validateRuntimeSlug(slug, { onStrictViolation } = {}) {
  const valid = typeof slug === 'string' && /^[a-z0-9][a-z0-9_-]*$/i.test(slug);
  if (valid) {
    return true;
  }

  const message = `[RuntimeImportIntegrity] Invalid slug: ${slug}`;
  const mode = getImportIntegrityMode();
  if (mode === 'enforce-dev') {
    throw new Error(message);
  }

  if (mode === 'enforce-strict') {
    console.error(message);
    onStrictViolation?.(message);
    return false;
  }

  console.warn(message);
  return true;
}

function validateRuntimeModulePath(modulePath, { onStrictViolation } = {}) {
  const value = String(modulePath ?? '').trim();
  const valid = value.length > 0
    && !/\s/.test(value)
    && !/^https?:\/\//i.test(value)
    && !/^javascript:/i.test(value);
  if (valid) {
    return true;
  }

  const message = `[RuntimeImportIntegrity] Invalid modulePath: ${modulePath}`;
  const mode = getImportIntegrityMode();
  if (mode === 'enforce-dev') {
    throw new Error(message);
  }

  if (mode === 'enforce-strict') {
    console.error(message);
    onStrictViolation?.(message);
    return false;
  }

  console.warn(message);
  return true;
}

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
      if (typeof candidate?.[method] !== 'function') {
        continue;
      }

      if (method === 'runTool') {
        const manifestRuntimeType = args?.[1]?.toolRuntimeType;
        const explicitRuntimeType = candidate?.toolRuntimeType ?? candidate?.runtime?.toolRuntimeType ?? manifestRuntimeType;
        const isExecutionOnly = explicitRuntimeType === 'execution' || Number(candidate[method].length ?? 0) >= 2;
        if (isExecutionOnly) {
          continue;
        }
      }

      await candidate[method](...args);
      return method;
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
  importModule = async (modulePath) => {
    const validation = await validateRuntimeModulePath(modulePath);

    if (!validation.valid) {
      console.warn('[RuntimeImportIntegrity] Validation failed', { modulePath, ...validation });
    }

    return import(modulePath);
  },
  logger = createRuntimeMigrationLogger({ channel: 'legacy' })
} = {}) {
  if (!validateRuntimeSlug(slug)) {
    return { mounted: false, mode: 'legacy.import-integrity-blocked' };
  }

  let workingModule = module;

  if (!workingModule && modulePath) {
    if (!validateRuntimeModulePath(modulePath)) {
      return { mounted: false, mode: 'legacy.import-integrity-blocked' };
    }

    try {
      workingModule = await importModule(modulePath);
    } catch (error) {
      logger?.warn?.(`Failed to import legacy module for "${slug}".`, error);
    }
  }

  const candidates = toCandidates(workingModule);

  const lifecycleMethod = await invokeFirst(candidates, ['create'], { slug, root, manifest });
  logger.info(`Starting legacy bootstrap flow for "${slug}".`);
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
