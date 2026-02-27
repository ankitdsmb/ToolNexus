let monacoPromise = null;

export async function loadMonaco() {
  if (window.monaco?.editor) {
    console.info('[runtime] Monaco already loaded');
    return window.monaco;
  }

  if (monacoPromise) {
    return monacoPromise;
  }

  if (typeof window.require !== 'function') {
    console.error('[runtime] Monaco loader missing');
    return null;
  }

  monacoPromise = new Promise((resolve, reject) => {
    const ctx = window.require?.s?.contexts?._;
    const existingVs = ctx?.config?.paths?.vs;

    if (!existingVs) {
      window.require.config({
        paths: {
          vs: '/lib/monaco/vs'
        }
      });
    }

    window.require.onError = (err) => {
      console.error('[runtime] Monaco AMD error', err);
      reject(err);
    };

    window.require(
      ['vs/editor/editor.main'],
      (monacoNamespace) => {
        const resolvedMonaco = monacoNamespace ?? window.monaco;

        if (resolvedMonaco && !window.monaco) {
          window.monaco = resolvedMonaco;
        }

        if (!resolvedMonaco?.editor) {
          console.warn('[runtime] Monaco module resolved without editor; falling back to basic editors');
          resolve(null);
          return;
        }

        console.info('[runtime] Monaco loaded successfully');
        resolve(resolvedMonaco);
      },
      reject
    );
  }).catch((error) => {
    monacoPromise = null;
    throw error;
  });

  return monacoPromise;
}

export function resetMonacoLoaderForTesting() {
  monacoPromise = null;
}

window.ToolNexusRuntimeServices ??= {};
window.ToolNexusRuntimeServices.monacoLoader = {
  load: loadMonaco
};
