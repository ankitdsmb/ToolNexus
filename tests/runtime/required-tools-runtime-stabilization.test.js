import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';

import * as jsonFormatterModule from '../../src/ToolNexus.Web/wwwroot/js/tools/json-formatter.js';
import * as jsonValidatorModule from '../../src/ToolNexus.Web/wwwroot/js/tools/json-validator.js';
import * as xmlFormatterModule from '../../src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.js';
import * as csvViewerModule from '../../src/ToolNexus.Web/wwwroot/js/tools/csv-viewer.js';
import * as regexTesterModule from '../../src/ToolNexus.Web/wwwroot/js/tools/regex-tester.js';

const REQUIRED_TOOLS = ['json-formatter', 'json-validator', 'xml-formatter', 'csv-viewer', 'regex-tester'];

const MODULE_MAP = {
  'json-formatter': jsonFormatterModule,
  'json-validator': jsonValidatorModule,
  'xml-formatter': xmlFormatterModule,
  'csv-viewer': csvViewerModule,
  'regex-tester': regexTesterModule
};

function installMonacoStub() {
  const createModel = (initialValue = '') => {
    let value = initialValue;
    const listeners = new Set();

    return {
      getValue: () => value,
      setValue: (next) => {
        value = String(next);
        listeners.forEach((listener) => listener());
      },
      onDidChangeContent: (listener) => {
        listeners.add(listener);
        return { dispose: () => listeners.delete(listener) };
      },
      dispose: () => listeners.clear()
    };
  };

  window.require = (deps, callback) => callback();
  window.require.config = () => {};
  window.monaco = {
    MarkerSeverity: { Error: 8 },
    editor: {
      createModel,
      create: () => ({ revealLine: () => {}, updateOptions: () => {}, dispose: () => {} }),
      setModelMarkers: () => {}
    }
  };
}

function createShell(slug) {
  document.body.innerHTML = `
    <div data-runtime-container="true">
      <div id="tool-root" data-tool-root="true" data-tool-slug="${slug}">
        <header data-tool-header="true"></header>
        <section data-tool-body="true">
          <section data-tool-input="true"></section>
          <section data-tool-output="true"></section>
          <div data-tool-actions="true"></div>
        </section>
      </div>
    </div>`;

  return document.getElementById('tool-root');
}

async function readTemplate(slug) {
  const templatePath = path.join(process.cwd(), 'src/ToolNexus.Web/wwwroot/tool-templates', `${slug}.html`);
  return fs.readFile(templatePath, 'utf8');
}

describe('required tool runtime stabilization', () => {
  beforeEach(() => {
    installMonacoStub();
    window.ToolNexusConfig = {
      tool: {},
      runtimeUiMode: 'custom',
      runtimeComplexityTier: 3,
      runtimeEnvironment: 'Production'
    };
    window.ToolNexusLogging = { runtimeDebugEnabled: false };
    window.ToolNexusModules = {};
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.ToolNexus;
    delete window.ToolNexusConfig;
    delete window.ToolNexusLogging;
    delete window.ToolNexusModules;
    delete window.monaco;
    delete window.require;
  });

  test.each(REQUIRED_TOOLS)('%s mounts with modern runtime path and no legacy bridge', async (slug) => {
    const root = createShell(slug);
    const events = [];

    const runtime = createToolRuntime({
      observer: {
        emit(eventName, payload) {
          events.push({ eventName, payload });
        }
      },
      getRoot: () => root,
      loadManifest: async () => ({
        slug,
        dependencies: [],
        styles: [],
        modulePath: `/js/tools/${slug}.js`,
        templatePath: `/tool-templates/${slug}.html`,
        uiMode: 'custom',
        complexityTier: 3
      }),
      templateLoader: async (templateSlug, targetRoot) => {
        targetRoot.innerHTML = await readTemplate(templateSlug);
      },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async (modulePath) => {
        const toolSlug = path.basename(modulePath, '.js');
        return MODULE_MAP[toolSlug];
      }
    });

    await runtime.bootstrapToolRuntime();

    const mountSuccess = events.find((entry) => entry.eventName === 'mount_success');
    const compatibility = events.find((entry) => entry.eventName === 'compatibility_mode_used');
    const mountFailure = events.find((entry) => entry.eventName === 'mount_failure');

    expect(mountFailure).toBeUndefined();
    expect(mountSuccess).toBeTruthy();
    expect(mountSuccess.payload.modeUsed).toBe('modern');
    expect(compatibility).toBeUndefined();
    expect(root.firstElementChild).not.toBeNull();
  });
});
