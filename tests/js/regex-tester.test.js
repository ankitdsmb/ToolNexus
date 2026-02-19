import {
  RegexToolError,
  initRegexTesterApp,
  normalizeRegexOptions,
  runRegexEvaluation,
  runTool,
  sanitizeFlags,
  validateRegexInputs
} from '../../src/ToolNexus.Web/wwwroot/js/tools/regex-tester.js';

describe('regex-tester logic', () => {
  test('sanitizes and normalizes options defensively', () => {
    expect(sanitizeFlags('ggim$u')).toBe('gimu');
    expect(sanitizeFlags(null)).toBe('');

    const normalized = normalizeRegexOptions({
      pattern: '(foo)',
      input: 'foo bar',
      flags: 'migzz',
      maxInputLength: '1500'
    });

    expect(normalized).toEqual(expect.objectContaining({
      pattern: '(foo)',
      candidate: 'foo bar',
      flags: 'gim',
      maxInputLength: 1500,
      maxPatternLength: 2048
    }));
  });

  test('validates limits and invalid types', () => {
    expect(() => validateRegexInputs({}, 'a')).toThrow(RegexToolError);
    expect(() => validateRegexInputs('a', null)).toThrow(RegexToolError);
    expect(() => validateRegexInputs('x'.repeat(10), 'a', { maxPatternLength: 3 })).toThrow('Pattern is too large');
    expect(() => validateRegexInputs('a', 'x'.repeat(10), { maxInputLength: 3 })).toThrow('Input is too large');
  });

  test('evaluates deterministically with unicode, groups and global matching', () => {
    const payload = 'Åsa, 😀, Åke';
    const first = runRegexEvaluation('Å[^,\s]*', payload, 'gu');
    const second = runRegexEvaluation('Å[^,\s]*', payload, 'gu');

    expect(first).toEqual(second);
    expect(first.isMatch).toBe(true);
    expect(first.matchCount).toBe(2);
    expect(first.matches.at(-1)).toBe('Åke');

    const groups = runRegexEvaluation('(foo)-(bar)', 'foo-bar baz', '');
    expect(groups.groups).toEqual(['foo', 'bar']);

    expect(() => runRegexEvaluation('([a-z]+', 'abc', '')).toThrow('Pattern is not a valid regular expression.');
  });



  test('covers includeMatches false, non-global and capped match collection', () => {
    const withoutMatches = runRegexEvaluation('foo', 'foo foo', '', { includeMatches: false });
    expect(withoutMatches.matchCount).toBe(0);

    const nonGlobal = runRegexEvaluation('foo', 'foo foo', 'i');
    expect(nonGlobal.matches).toEqual(['foo']);

    const capped = runRegexEvaluation('a', 'a'.repeat(800), 'g');
    expect(capped.matchCount).toBe(500);
  });

  test('runTool enforces action and handles malicious-like payloads safely', async () => {
    await expect(runTool('convert', 'abc')).rejects.toThrow('Unsupported action');

    const payload = '<script>alert(1)</script> abc';
    const result = await runTool('test', payload, { pattern: '<script>', flags: 'g' });
    const parsed = JSON.parse(result);
    expect(parsed.isMatch).toBe(true);
    expect(parsed.matches).toEqual(['<script>']);
  });
});

describe('regex-tester dom behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = `<section data-tool="regex-tester">
      <input data-regex-pattern value="foo" />
      <input data-regex-flags value="g" />
      <textarea data-regex-input>foo foo</textarea>
      <button data-regex-run>Run</button>
      <textarea data-regex-output></textarea>
      <div data-regex-status></div>
    </section>`;

    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  });

  test('idempotent initialization and input driven updates', async () => {
    initRegexTesterApp(document, window);
    initRegexTesterApp(document, window);

    const root = document.querySelector('[data-tool="regex-tester"]');
    const output = document.querySelector('[data-regex-output]');
    const status = document.querySelector('[data-regex-status]');

    expect(root.dataset.regexTesterInitialized).toBe('true');
    expect(output.value).toContain('"matchCount": 2');

    const pattern = document.querySelector('[data-regex-pattern]');
    pattern.value = 'bar';
    pattern.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(status.textContent).toBe('No matches found.');
  });

  test('click updates error status for invalid regex', async () => {
    initRegexTesterApp(document, window);

    const pattern = document.querySelector('[data-regex-pattern]');
    const runButton = document.querySelector('[data-regex-run]');
    const status = document.querySelector('[data-regex-status]');

    pattern.value = '(';
    runButton.click();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(status.textContent).toContain('valid regular expression');
  });



  test('handles missing required elements and cancelAnimationFrame path', async () => {
    document.body.innerHTML = '<section data-tool="regex-tester"><textarea data-regex-output></textarea></section>';
    expect(() => initRegexTesterApp(document, window)).not.toThrow();

    document.body.innerHTML = `<section data-tool="regex-tester">
      <input data-regex-pattern value="foo" />
      <input data-regex-flags value="g" />
      <textarea data-regex-input>foo</textarea>
      <textarea data-regex-output></textarea>
      <div data-regex-status></div>
    </section>`;

    initRegexTesterApp(document, window);
    const pattern = document.querySelector('[data-regex-pattern]');
    pattern.value = 'f';
    pattern.dispatchEvent(new Event('input', { bubbles: true }));
    pattern.value = 'fo';
    pattern.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(document.querySelector('[data-regex-output]').value).toContain('"isMatch": true');
  });

  test('safe no-op without expected root', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => initRegexTesterApp(document, window)).not.toThrow();
  });
});
