import { describe, expect, test } from 'vitest';
import {
  validateRuntimeEntrypointContext,
  preflightRuntimeDom,
  classifyModuleImportFailure
} from '../../src/ToolNexus.Web/wwwroot/js/tool-runtime.js';
import { createDependencyLoader } from '../../src/ToolNexus.Web/wwwroot/js/runtime/dependency-loader.js';

describe('runtime hardening regressions', () => {
  test('ESM runtime entry validation accepts module script context', () => {
    const result = validateRuntimeEntrypointContext({
      doc: { currentScript: { type: 'module' } },
      logger: { error: () => {} }
    });

    expect(result).toEqual(expect.objectContaining({ valid: true, reason: 'module_context' }));
  });

  test('classic script context reports deterministic runtime error', () => {
    const errors = [];
    const result = validateRuntimeEntrypointContext({
      doc: { currentScript: { type: 'text/javascript' } },
      logger: { error: (message) => errors.push(message) }
    });

    expect(result).toEqual(expect.objectContaining({ valid: false, reason: 'classic_script_context' }));
    expect(errors.at(0)).toContain("ToolNexus runtime must be loaded using type='module'.");
  });

  test('dependency loader sets module script type when descriptor opts in', async () => {
    const appended = [];
    const appendChild = document.head.appendChild.bind(document.head);
    document.head.appendChild = (node) => {
      appended.push(node);
      setTimeout(() => node.dispatchEvent(new Event('load')), 0);
      return appendChild(node);
    };

    try {
      const loader = createDependencyLoader();
      await loader.loadDependencies({
        toolSlug: 'json-formatter',
        dependencies: [{ src: '/js/runtime-sdk/tool-sdk.js', module: true }]
      });
    } finally {
      document.head.appendChild = appendChild;
    }

    const scriptNode = appended.find((node) => node.tagName === 'SCRIPT');
    expect(scriptNode?.type).toBe('module');
  });

  test('missing runtime anchors are classified as dom_contract_failure preflight', () => {
    document.body.innerHTML = '<div id="tool-root"></div>';
    const root = document.getElementById('tool-root');

    const validation = preflightRuntimeDom(root);
    expect(validation).toEqual({ valid: false, reason: 'missing_tool_root_or_anchor' });
  });

  test('module import syntax failures are classified for telemetry', () => {
    const classified = classifyModuleImportFailure(new SyntaxError('Unexpected token export'), {
      modulePath: '/js/tools/css-minifier.js',
      validationReason: 'not_allowlisted'
    });

    expect(classified).toEqual(expect.objectContaining({
      classification: 'module_syntax_error',
      modulePath: '/js/tools/css-minifier.js',
      reason: 'not_allowlisted',
      errorMessage: 'Unexpected token export'
    }));
  });
});
