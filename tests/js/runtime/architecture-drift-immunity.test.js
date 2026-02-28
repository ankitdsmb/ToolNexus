import fs from 'node:fs';
import path from 'node:path';

function indexOfOrFail(haystack, needle) {
  const index = haystack.indexOf(needle);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe('architecture drift immunity guardrails', () => {
  test('ToolShell canonical anchors remain immutable', () => {
    const shellPath = path.resolve(process.cwd(), 'src/ToolNexus.Web/Views/Tools/ToolShell.cshtml');
    const source = fs.readFileSync(shellPath, 'utf8');

    const requiredAnchors = [
      'data-tool-shell="true"',
      'data-tool-context="true"',
      'data-tool-input="true"',
      'data-tool-status="true"',
      'data-tool-output="true"',
      'data-tool-followup="true"',
      'data-tool-actions="true"'
    ];

    for (const anchor of requiredAnchors) {
      expect(source).toContain(anchor);
    }
  });

  test('universal execution lifecycle order stays request → authority → snapshot → runtime → conformance', () => {
    const enginePath = path.resolve(process.cwd(), 'src/ToolNexus.Application/Services/Pipeline/UniversalExecutionEngine.cs');
    const source = fs.readFileSync(enginePath, 'utf8');

    const authorityIndex = indexOfOrFail(source, 'authorityResolver.ResolveAuthority(context, request)');
    const snapshotIndex = indexOfOrFail(source, 'executionSnapshotBuilder.BuildSnapshot(request, context, authority)');
    const runtimeIndex = indexOfOrFail(source, 'adapter.ExecuteAsync(request with { RuntimeLanguage = language }, context, cancellationToken)');
    const conformanceIndex = indexOfOrFail(source, 'conformanceValidator.Validate(adapterResult, request)');

    expect(authorityIndex).toBeLessThan(snapshotIndex);
    expect(snapshotIndex).toBeLessThan(runtimeIndex);
    expect(runtimeIndex).toBeLessThan(conformanceIndex);

    expect((source.match(/legacyExecutionStrategy\.ExecuteAsync\(/g) ?? []).length).toBe(1);
    expect((source.match(/adapter\.ExecuteAsync\(/g) ?? []).length).toBe(1);
  });

  test('runtime reasoning model constants stay locked', () => {
    const runtimePath = path.resolve(process.cwd(), 'src/ToolNexus.Web/wwwroot/js/runtime/tool-unified-control-runtime.js');
    const source = fs.readFileSync(runtimePath, 'utf8');

    expect(source).toContain("const OUTCOME_CLASSES = Object.freeze({");
    expect(source).toContain("usableSuccess: 'usable_success'");
    expect(source).toContain("warningPartial: 'warning_partial'");
    expect(source).toContain("uncertainResult: 'uncertain_result'");
    expect(source).toContain("failed: 'failed'");
    expect(source).toContain("const EXECUTION_STATES = Object.freeze({");
    expect(source).toContain("label: 'Running'");
    expect(source).toContain("label: 'Completed'");
  });
});
