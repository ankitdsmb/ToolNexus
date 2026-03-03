import { defineConfig } from 'vitest/config';
import { createRequire } from 'node:module';
import { platform, arch, report } from 'node:process';

const require = createRequire(import.meta.url);

function getRollupNativePackageName() {
  const isMusl = platform === 'linux' && !report.getReport().header.glibcVersionRuntime;

  const names = {
    linux: {
      x64: isMusl ? '@rollup/rollup-linux-x64-musl' : '@rollup/rollup-linux-x64-gnu',
      arm64: isMusl ? '@rollup/rollup-linux-arm64-musl' : '@rollup/rollup-linux-arm64-gnu'
    },
    darwin: {
      x64: '@rollup/rollup-darwin-x64',
      arm64: '@rollup/rollup-darwin-arm64'
    },
    win32: {
      x64: '@rollup/rollup-win32-x64-msvc',
      arm64: '@rollup/rollup-win32-arm64-msvc'
    }
  };

  return names[platform]?.[arch];
}

const nativePackage = getRollupNativePackageName();
let rollupAlias = {};

if (nativePackage) {
  try {
    require.resolve(nativePackage);
  } catch {
    rollupAlias = {
      rollup: '@rollup/wasm-node'
    };
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '/js': '/src/ToolNexus.Web/wwwroot/js',
      ...rollupAlias
    }
  },
  test: {
    include: ['tests/runtime/**/*.test.js', 'tests/ui/**/*.test.js'],
    environment: 'jsdom',
    setupFiles: ['tests/js/setup-jest.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov']
    }
  }
});
