export function safeDomMount(root, mode = 'enhance') {
  if (!root) {
    return { rootExisted: false, hadSsrMarkup: false, mode, ssrSnapshot: [] };
  }

  const hadSsrMarkup = root.children.length > 0;
  const ssrSnapshot = hadSsrMarkup ? Array.from(root.childNodes).map((node) => node.cloneNode(true)) : [];

  if (mode === 'replace') {
    root.dataset.runtimeReplaceRequested = 'true';
    root.dataset.runtimeMutationSkipped = 'true';
  }

  if (mode === 'legacy') {
    root.dataset.runtimeLegacy = 'true';
  }

  if (mode === 'enhance' && hadSsrMarkup) {
    root.dataset.runtimeEnhanced = 'true';
  }

  return {
    rootExisted: true,
    hadSsrMarkup,
    mode,
    ssrSnapshot
  };
}
