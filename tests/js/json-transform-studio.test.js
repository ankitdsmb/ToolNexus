import { ACTIONS, executeTransformation } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-transform-studio.api.js';

describe('json-transform-studio api', () => {
  test('formats deterministically', () => {
    const result = executeTransformation({ action: ACTIONS.FORMAT, input: '{"b":2,"a":1}' });
    expect(result.ok).toBe(true);
    expect(result.output).toContain('\n  "a": 1,');
  });

  test('minifies JSON deterministically', () => {
    const result = executeTransformation({ action: ACTIONS.MINIFY, input: '{"b":2,"a":1}' });
    expect(result.ok).toBe(true);
    expect(result.output).toBe('{"a":1,"b":2}');
  });

  test('flattens and filters paths', () => {
    const flatten = executeTransformation({ action: ACTIONS.FLATTEN, input: '{"user":{"id":10}}' });
    expect(flatten.ok).toBe(true);
    expect(JSON.parse(flatten.output)['$.user.id']).toBe(10);

    const filtered = executeTransformation({
      action: ACTIONS.FILTER_PATHS,
      input: '{"user":{"id":10,"name":"ana"}}',
      filterText: '$.user.id,$.user.missing'
    });

    expect(filtered.ok).toBe(true);
    const parsed = JSON.parse(filtered.output);
    expect(parsed['$.user.id']).toBe(10);
    expect(parsed['$.user.missing']).toBeNull();
  });

  test('extracts nested keys and emits parse errors', () => {
    const extracted = executeTransformation({ action: ACTIONS.EXTRACT_KEYS, input: '{"z":1,"inner":{"a":2}}' });
    expect(extracted.ok).toBe(true);
    expect(extracted.output).toContain('"a"');
    expect(extracted.output).toContain('"z"');

    const invalid = executeTransformation({ action: ACTIONS.FORMAT, input: '{bad json}' });
    expect(invalid.ok).toBe(false);
    expect(invalid.error.title).toBe('Invalid JSON input');
  });
});
