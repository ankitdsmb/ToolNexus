export async function mountToolLifecycle({ module, slug, root, manifest }) {
  if (typeof module?.mount === 'function') {
    await module.mount(root, manifest);
    return;
  }

  if (typeof module?.default?.mount === 'function') {
    await module.default.mount(root, manifest);
    return;
  }

  if (typeof module?.init === 'function') {
    await module.init(root, manifest);
    return;
  }

  if (typeof module?.default?.init === 'function') {
    await module.default.init(root, manifest);
    return;
  }

  if (typeof window.ToolNexusKernel?.initialize === 'function') {
    await window.ToolNexusKernel.initialize({ slug, root, manifest, module });
    return;
  }

  const legacyModule = window.ToolNexusModules?.[slug];
  if (typeof legacyModule?.mount === 'function') {
    await legacyModule.mount(root, manifest);
    return;
  }

  if (typeof legacyModule?.init === 'function') {
    await legacyModule.init(root, manifest);
    return;
  }

  throw new Error(`tool-lifecycle-adapter: no supported lifecycle found for "${slug}".`);
}
