const NOOP_ASYNC = async () => {};

function assertToolContract(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('defineTool() requires a tool definition object.');
  }

  if (!definition.id || typeof definition.id !== 'string') {
    throw new Error('defineTool() requires a string id.');
  }

  if (definition.onRun && typeof definition.onRun !== 'function') {
    throw new Error(`Tool "${definition.id}" onRun must be a function when provided.`);
  }

  if (definition.run && typeof definition.run !== 'function') {
    throw new Error(`Tool "${definition.id}" run must be a function when provided.`);
  }

  if (!definition.onRun && !definition.run) {
    throw new Error(`Tool "${definition.id}" must provide run(input, context) or onRun(input, context).`);
  }
}

function normalizeHook(hook) {
  return typeof hook === 'function' ? hook : NOOP_ASYNC;
}

export function defineTool(definition) {
  assertToolContract(definition);

  return Object.freeze({
    id: definition.id,
    name: definition.name ?? definition.id,
    description: definition.description ?? '',
    permissions: Array.isArray(definition.permissions) ? [...definition.permissions] : [],
    metadata: definition.metadata ? { ...definition.metadata } : {},
    onLoad: normalizeHook(definition.onLoad),
    onActivate: normalizeHook(definition.onActivate),
    onRun: definition.onRun ?? definition.run,
    onSuspend: normalizeHook(definition.onSuspend),
    onUnload: normalizeHook(definition.onUnload),
    run: definition.run ?? definition.onRun
  });
}
