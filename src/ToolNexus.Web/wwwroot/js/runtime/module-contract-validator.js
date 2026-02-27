export function validateModuleContract(module, required, moduleName) {
  const missing = required.filter((key) => !(key in module));

  if (missing.length) {
    throw new Error(`[ModuleContract] ${moduleName} missing exports: ${missing.join(', ')}`);
  }
}

export function isModuleContractError(error) {
  const message = String(error?.message ?? error ?? '');
  return message.includes('[ModuleContract]') || message.includes('does not provide an export named');
}
