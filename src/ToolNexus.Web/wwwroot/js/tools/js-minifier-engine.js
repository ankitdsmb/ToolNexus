import { JS_MINIFIER_CONFIG, COMPRESSION_MODES } from './js-minifier-config.js';
import { MinifierError } from './js-minifier-errors.js';

let terserLoaderPromise = null;

function loadTerser() {
  if (window.Terser?.minify) return Promise.resolve(window.Terser);
  if (terserLoaderPromise) return terserLoaderPromise;

  terserLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(JS_MINIFIER_CONFIG.scriptId);
    if (existing && window.Terser?.minify) {
      resolve(window.Terser);
      return;
    }

    const script = existing ?? document.createElement('script');
    script.id = JS_MINIFIER_CONFIG.scriptId;
    script.src = JS_MINIFIER_CONFIG.scriptSrc;
    script.async = true;

    script.onload = () => {
      if (!window.Terser?.minify) {
        reject(new MinifierError('Runtime Error', 'Minifier engine failed to initialize.'));
        return;
      }
      resolve(window.Terser);
    };

    script.onerror = () => reject(new MinifierError('Runtime Error', 'Unable to load JavaScript minifier engine.'));

    if (!existing) document.head.appendChild(script);
  });

  return terserLoaderPromise;
}

function buildOptions({ preserveLicenseComments, compressionMode, asModule }) {
  const aggressive = compressionMode === COMPRESSION_MODES.aggressive;

  return {
    parse: {
      ecma: 2022,
      module: asModule,
      bare_returns: true
    },
    compress: aggressive
      ? {
        ecma: 2020,
        passes: 2,
        booleans_as_integers: false,
        drop_console: false,
        drop_debugger: true,
        module: asModule,
        toplevel: false
      }
      : {
        ecma: 2020,
        passes: 1,
        module: asModule,
        toplevel: false,
        defaults: true
      },
    mangle: aggressive
      ? { toplevel: false, safari10: true }
      : { toplevel: false, safari10: true, keep_fnames: true, keep_classnames: true },
    format: {
      comments: preserveLicenseComments ? /^!/ : false,
      ecma: 2020,
      semicolons: true
    },
    module: asModule,
    ecma: 2020
  };
}

export async function minifyJavaScript(input, options) {
  const terser = await loadTerser();

  const attempts = [true, false];

  for (const asModule of attempts) {
    const result = await terser.minify(input, buildOptions({ ...options, asModule }));

    if (!result.error && typeof result.code === 'string') {
      return result.code;
    }

    if (!asModule && result.error) throw result.error;
  }

  throw new MinifierError('Minification Failed', 'Minifier returned an empty response.');
}
