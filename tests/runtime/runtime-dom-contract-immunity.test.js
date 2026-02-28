import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createToolRuntime } from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { validateToolDom } from '../../src/ToolNexus.Web/wwwroot/js/runtime/tool-dom-contract-validator.js';

const manifestDir = path.join(process.cwd(), 'src/ToolNexus.Web/App_Data/tool-manifests');
const manifestFiles = fs.readdirSync(manifestDir).filter((file) => file.endsWith('.json')).sort();

function createCanonicalShell(slug) {
  document.body.innerHTML = `
    <section id="tool-root" data-tool-root="true" data-tool-shell="true" data-tool-slug="${slug}">
      <header data-tool-context="true" data-tool-header="true"></header>
      <section data-tool-input="true"></section>
      <section>
        <div data-tool-status="true"></div>
        <section data-tool-output="true"></section>
      </section>
      <footer data-tool-followup="true" data-tool-actions="true"></footer>
    </section>`;

  return document.getElementById('tool-root');
}

describe('runtime DOM contract immunity', () => {
  const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

  beforeEach(() => {
    window.ToolNexusConfig = {
      tool: {},
      runtimeUiMode: 'custom',
      runtimeComplexityTier: 2,
      runtimeEnvironment: 'Production'
    };
    window.ToolNexusLogging = { runtimeDebugEnabled: false };
    window.ToolNexusModules = {};
    consoleInfoSpy.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.ToolNexus;
    delete window.ToolNexusConfig;
    delete window.ToolNexusLogging;
    delete window.ToolNexusModules;
  });

  test.each(manifestFiles)('%s boots with tool-root scoped validation and no dom contract failures', async (manifestFile) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(manifestDir, manifestFile), 'utf8'));
    const slug = manifest.slug;
    const root = createCanonicalShell(slug);
    const events = [];
    const validationRecords = [];
    const adapterCalls = [];

    const runtime = createToolRuntime({
      observer: {
        emit(eventName, payload) {
          events.push({ eventName, payload });
        }
      },
      getRoot: () => root,
      loadManifest: async () => ({
        ...manifest,
        dependencies: [],
        styles: [],
        modulePath: `/js/tools/${slug}.js`
      }),
      templateLoader: async (_slug, target) => {
        const handoff = document.createElement('section');
        handoff.setAttribute('data-runtime-template-handoff', 'true');
        handoff.innerHTML = '<section class="tool-ui">template ready</section>';
        target.append(handoff);
      },
      dependencyLoader: { loadDependencies: async () => {} },
      importModule: async () => ({
        async create() {},
        async init() {},
        async destroy() {}
      }),
      adaptDomContract: (scope, capabilities) => {
        adapterCalls.push({ scopeId: scope?.id ?? '', capabilities });
        return { adapted: false, reason: 'test-spy' };
      },
      validateDomContract: (scope, options = {}) => {
        const report = validateToolDom(scope, options);
        validationRecords.push({
          phase: options.phase ?? 'unspecified',
          scopeId: scope?.id ?? '',
          isValid: report.isValid,
          detectedLayoutType: report.detectedLayoutType
        });
        return report;
      }
    });

    await runtime.bootstrapToolRuntime();

    const preMountRoot = validationRecords.find((entry) => entry.phase === 'pre-mount');
    expect(preMountRoot).toBeTruthy();
    expect(preMountRoot.scopeId).toBe('tool-root');
    expect(preMountRoot.isValid).toBe(true);

    const domFailures = events.filter((entry) => entry.eventName === 'dom_contract_failure');
    expect(domFailures).toHaveLength(0);

    const canonicalRootValidations = validationRecords.filter((entry) =>
      entry.phase.startsWith('pre-mount') || entry.phase.startsWith('post-mount'));
    expect(canonicalRootValidations.length).toBeGreaterThan(0);
    canonicalRootValidations.forEach((entry) => {
      expect(entry.scopeId).toBe('tool-root');
    });

    const shellAnchors = ['data-tool-shell', 'data-tool-context', 'data-tool-status', 'data-tool-followup'];
    shellAnchors.forEach((anchor) => {
      const selector = `[${anchor}]`;
      const present = root.matches(selector) || Boolean(root.querySelector(selector));
      expect(present).toBe(true);
    });

    expect(adapterCalls).toHaveLength(0);

    const unexpectedLegacyAdapter = consoleInfoSpy.mock.calls.some(([message, payload]) =>
      String(message).includes('[DomAdapter] legacy layout detected')
      && payload?.slug === slug);
    expect(unexpectedLegacyAdapter).toBe(false);

    const legacyCompatibilityEvents = events.filter((entry) =>
      entry.eventName === 'compatibility_mode_used'
      && entry.payload?.modeUsed === 'legacy');
    expect(legacyCompatibilityEvents).toHaveLength(0);

    const scopeLogs = consoleInfoSpy.mock.calls
      .filter(([message]) => String(message).includes('[DomContract] validation scope resolved'))
      .map(([, payload]) => payload)
      .filter((payload) => payload?.phase === 'pre-mount' && payload?.scopeIsToolRoot !== undefined);

    expect(scopeLogs.length).toBeGreaterThan(0);
    scopeLogs.forEach((log) => {
      expect(log.scopeIsToolRoot).toBe(true);
      expect(log.scopeId).toBe('tool-root');
    });
  });
});
