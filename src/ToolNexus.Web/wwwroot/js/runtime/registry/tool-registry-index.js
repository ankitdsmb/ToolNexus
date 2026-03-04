const DEFAULT_TOOL_REGISTRY_INDEX = Object.freeze({
  // Precompiled registry entries can be generated at build/publish time.
  // Keep this object as a fast-lookup source for runtime bootstrap.
});

export function getBundledToolRegistryIndex() {
  const runtimeIndex = globalThis.window?.ToolNexusToolRegistryIndex;
  if (runtimeIndex && typeof runtimeIndex === 'object') {
    return runtimeIndex;
  }

  return DEFAULT_TOOL_REGISTRY_INDEX;
}
