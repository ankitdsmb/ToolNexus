import {
  RegexToolError,
  initRegexTesterApp,
  mountRegexTester,
  normalizeRegexOptions,
  runRegexEvaluation,
  runTool,
  sanitizeFlags,
  validateRegexInputs
} from '../../src/ToolNexus.Web/wwwroot/js/tools/regex-tester.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../../src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

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

describe('regex-tester platform lifecycle', () => {
  beforeEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();

    document.body.innerHTML = `<section data-tool="regex-tester" class="tool">
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

  afterEach(() => {
    resetKeyboardEventManagerForTesting();
    resetToolPlatformKernelForTesting();
  });

  test('idempotent mount and kernel lifecycle state is stable', async () => {
    const root = document.querySelector('[data-tool="regex-tester"]');

    const firstHandle = mountRegexTester(root);
    const secondHandle = mountRegexTester(root);

    expect(firstHandle).toBe(secondHandle);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(1);
    expect(getToolPlatformKernel().getLifecycleState('regex-tester', root)).toBe('initialized');

    const output = document.querySelector('[data-regex-output]');
    expect(output.value).toContain('"matchCount": 2');

    const pattern = document.querySelector('[data-regex-pattern]');
    pattern.value = 'bar';
    pattern.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(document.querySelector('[data-regex-status]').textContent).toBe('No matches found.');
  });

  test('lifecycle cleanup and keyboard listener ownership are isolated', () => {
    const root = document.querySelector('[data-tool="regex-tester"]');
    const handle = mountRegexTester(root);
    const keyboard = getKeyboardEventManager();

    expect(keyboard.getRegisteredHandlerCount()).toBe(1);
    expect(keyboard.getActiveGlobalListenerCount()).toBe(1);

    handle.destroy();

    expect(keyboard.getRegisteredHandlerCount()).toBe(0);
    expect(keyboard.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });

  test('keyboard shortcut is scoped to active tool root only', () => {
    const primary = document.querySelector('[data-tool="regex-tester"]');
    const secondary = document.createElement('section');
    secondary.dataset.tool = 'regex-tester';
    secondary.className = 'tool';
    secondary.innerHTML = `
      <input data-regex-pattern value="bar" />
      <input data-regex-flags value="g" />
      <textarea data-regex-input>bar bar</textarea>
      <button data-regex-run>Run</button>
      <textarea data-regex-output></textarea>
      <div data-regex-status></div>`;
    document.body.appendChild(secondary);

    mountRegexTester(primary);
    mountRegexTester(secondary);

    const firstPattern = primary.querySelector('[data-regex-pattern]');
    const firstInput = primary.querySelector('[data-regex-input]');
    const firstStatus = primary.querySelector('[data-regex-status]');

    firstPattern.value = '(';
    firstInput.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));

    expect(firstStatus.textContent).toContain('valid regular expression');
    expect(secondary.querySelector('[data-regex-status]').textContent).toContain('Matched 2 occurrences');
  });

  test('remount stress x50 does not leak listeners or handles', () => {
    const keyboard = getKeyboardEventManager();

    for (let index = 0; index < 50; index += 1) {
      const root = document.createElement('section');
      root.dataset.tool = 'regex-tester';
      root.className = 'tool';
      root.innerHTML = `
        <input data-regex-pattern value="foo" />
        <input data-regex-flags value="g" />
        <textarea data-regex-input>foo foo</textarea>
        <button data-regex-run>Run</button>
        <textarea data-regex-output></textarea>
        <div data-regex-status></div>`;
      document.body.appendChild(root);

      const handle = mountRegexTester(root);
      handle.destroy();
      root.remove();
    }

    expect(keyboard.getRegisteredHandlerCount()).toBe(0);
    expect(keyboard.getActiveGlobalListenerCount()).toBe(0);
    expect(getToolPlatformKernel().getRegisteredToolCount()).toBe(0);
  });

  test('safe no-op without expected root', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => initRegexTesterApp(document)).not.toThrow();
  });
});
