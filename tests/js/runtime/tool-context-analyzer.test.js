import { jest } from '@jest/globals';
import { analyzeToolContext, createToolContextAnalyzer } from '../../../src/ToolNexus.Web/wwwroot/js/runtime/tool-context-analyzer.js';

describe('tool context analyzer', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('detects JSON text and emits suggestion model', () => {
    const suggestions = analyzeToolContext('{"hello":"world"}');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toEqual(expect.objectContaining({
      toolId: 'json-formatter',
      contextType: 'json'
    }));
    expect(typeof suggestions[0].confidence).toBe('number');
    expect(typeof suggestions[0].reason).toBe('string');
  });

  test('runs analysis asynchronously with debounce and does not block caller', async () => {
    jest.useFakeTimers();

    const analyzer = createToolContextAnalyzer({ debounceMs: 30 });
    const onSuggestions = jest.fn();
    const promise = analyzer.run('{"a":1}', onSuggestions);

    expect(onSuggestions).not.toHaveBeenCalled();

    jest.advanceTimersByTime(29);
    await Promise.resolve();
    expect(onSuggestions).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    await promise;

    expect(onSuggestions).toHaveBeenCalledTimes(1);
    analyzer.dispose();
  });
});
