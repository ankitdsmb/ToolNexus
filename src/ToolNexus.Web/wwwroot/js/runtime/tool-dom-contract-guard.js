const GUARDED_SELECTORS = Object.freeze([
  '[data-tool-shell]',
  '[data-tool-context]',
  '[data-tool-input]',
  '[data-tool-status]',
  '[data-tool-output]',
  '[data-tool-followup]'
]);

function captureContractReference(root, selector) {
  const node = root?.matches?.(selector) ? root : root?.querySelector?.(selector);
  return {
    selector,
    node,
    parent: node?.parentElement ?? null
  };
}

export function freezeDomContractRoots(root) {
  return GUARDED_SELECTORS.map((selector) => captureContractReference(root, selector));
}

export function assertDomContractRootsUnchanged(snapshot, phase = 'unknown') {
  for (const reference of snapshot ?? []) {
    if (!reference?.node) {
      continue;
    }

    if (!reference.node.isConnected) {
      throw new Error(`[DomContractGuard] ${reference.selector} was detached during ${phase}.`);
    }

    const attribute = reference.selector.slice(1, -1);
    if (!reference.node.hasAttribute(attribute)) {
      throw new Error(`[DomContractGuard] ${reference.selector} attribute was removed during ${phase}.`);
    }

    if (reference.parent && reference.node.parentElement !== reference.parent) {
      throw new Error(`[DomContractGuard] ${reference.selector} parent changed during ${phase}.`);
    }
  }
}
