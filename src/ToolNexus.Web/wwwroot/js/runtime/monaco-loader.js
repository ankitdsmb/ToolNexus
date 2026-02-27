/* =========================================================
   MONACO ENTERPRISE SAFE LOADER
========================================================= */

let monacoLoadPromise = null;

function ensureMonacoLoaded() {
  if (window.monaco?.editor) {
    return Promise.resolve(window.monaco);
  }

  if (monacoLoadPromise) {
    return monacoLoadPromise;
  }

  monacoLoadPromise = new Promise((resolve, reject) => {

    const loadEditor = () => {
      try {
        window.require(
          ['vs/editor/editor.main'],
          () => resolve(window.monaco),
          reject
        );
      } catch (err) {
        reject(err);
      }
    };

    // require already available (best case)
    if (typeof window.require === 'function') {
      loadEditor();
      return;
    }

    // load local loader.js yourself (runtime-safe fallback)
    const existing = document.querySelector(
      'script[data-runtime-monaco-loader]'
    );

    if (existing) {
      existing.addEventListener('load', loadEditor, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = '/lib/monaco/vs/loader.js';
    script.dataset.runtimeMonacoLoader = 'true';

    script.onload = () => {
      if (typeof window.require === 'function') {
        window.require.config({
          paths: { vs: '/lib/monaco/vs' }
        });
        loadEditor();
      } else {
        reject(new Error('Monaco loader loaded but require missing'));
      }
    };

    script.onerror = reject;
    document.head.appendChild(script);
  });

  return monacoLoadPromise;
} 
