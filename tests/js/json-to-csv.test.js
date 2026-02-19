import { jest } from '@jest/globals';
import { runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-to-csv.js';
import { parseJsonInput } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-to-csv/parser.js';
import { normalizeRows } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-to-csv/normalizer.js';
import { buildCsv } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-to-csv/csv-engine.js';
import { mountJsonToCsvTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-to-csv/ui.js';

function setupDom({ autoConvert = false } = {}) {
  document.body.innerHTML = `<main>
    <textarea id="jsonInput"></textarea>
    <textarea id="csvOutput"></textarea>
    <button id="convertBtn">Convert</button>
    <button id="clearBtn">Clear</button>
    <button id="copyBtn">Copy</button>
    <button id="downloadBtn">Download</button>
    <input id="autoConvertToggle" type="checkbox" ${autoConvert ? 'checked' : ''} />
    <input id="flattenToggle" type="checkbox" checked />
    <input id="includeNullToggle" type="checkbox" />
    <input id="sanitizeToggle" type="checkbox" checked />
    <input id="prettyToggle" type="checkbox" checked />
    <select id="delimiterSelect"><option value="comma" selected>comma</option><option value="tab">tab</option></select>
    <select id="arrayModeSelect"><option value="stringify" selected>stringify</option><option value="join">join</option></select>
    <input id="arraySeparatorInput" value=", " />
    <div id="statusText"></div>
    <div id="outputStats"></div>
    <section id="errorBox" hidden>
      <h2 id="errorTitle"></h2>
      <p id="errorDetail"></p>
      <p id="errorSuggestion"></p>
    </section>
  </main>`;

  global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
  global.URL.createObjectURL = jest.fn(() => 'blob:csv');
  global.URL.revokeObjectURL = jest.fn();
}

describe('json-to-csv logic', () => {
  test('parses and validates malformed json with location', () => {
    expect(() => parseJsonInput('')).toThrow('Paste a JSON object or an array of objects to convert.');

    try {
      parseJsonInput('{"name": "Ada", }');
    } catch (error) {
      expect(error.code).toBe('INVALID_JSON');
      expect(error.details.line).toBeGreaterThan(0);
      expect(error.details.column).toBeGreaterThan(0);
    }

    expect(() => parseJsonInput('["nope"]')).toThrow('Row 1 is not a JSON object');
  });

  test('normalizes nested structures and preserves deterministic headers', async () => {
    const rows = [
      { id: 1, profile: { name: 'Åsa', city: '東京' }, tags: ['a', 'b'], nullable: null, formula: '=2+2' },
      { id: 2, profile: { name: 'München' }, tags: ['😀'] }
    ];

    const normalized = await normalizeRows(rows, {
      flattenNested: true,
      includeNulls: true,
      arrayMode: 'join',
      arraySeparator: '|'
    });

    expect(normalized.headers).toEqual(['id', 'profile.name', 'profile.city', 'tags', 'nullable', 'formula']);
    expect(normalized.rows[0].tags).toBe('a|b');
    expect(normalized.rows[0].nullable).toBe('null');

    const csvA = buildCsv(normalized.headers, normalized.rows, { delimiter: ',', preventCsvInjection: true });
    const csvB = buildCsv(normalized.headers, normalized.rows, { delimiter: ',', preventCsvInjection: true });
    expect(csvA).toBe(csvB);
    expect(csvA).toContain("'=2+2");
  });

  test('runTool handles validate, convert, unknown action and malicious payload', async () => {
    await expect(runTool('unknown', '{}')).resolves.toEqual(expect.objectContaining({ success: false }));

    const validate = await runTool('validate', '[{"x":1},{"x":2}]');
    expect(validate.metadata.rowCount).toBe(2);

    const converted = await runTool('convert', '[{"formula":"=2+2"}]', { preventCsvInjection: true });
    expect(converted.success).toBe(true);
    expect(converted.data).toContain("'=2+2");
  });
});

describe('json-to-csv dom behavior', () => {
  test('idempotent mount, convert flow, copy/download and clear shortcuts', async () => {
    setupDom();
    mountJsonToCsvTool();
    mountJsonToCsvTool();

    const input = document.getElementById('jsonInput');
    input.value = '[{"name":"Ada","score":10}]';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    document.getElementById('convertBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(document.getElementById('csvOutput').value).toContain('name,score');

    document.getElementById('copyBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    document.getElementById('downloadBtn').click();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }));
    expect(document.getElementById('jsonInput').value).toBe('');
  });

  test('auto-convert and clipboard error handling branch', async () => {
    setupDom({ autoConvert: true });
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    mountJsonToCsvTool();

    const input = document.getElementById('jsonInput');
    input.value = '[{"name":"Ada"}]';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    document.getElementById('copyBtn').click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById('errorBox').hidden).toBe(false);
    expect(document.getElementById('errorTitle').textContent).toContain('Clipboard unavailable');
  });

  test('safe no-op when required elements are missing', () => {
    document.body.innerHTML = '<div>empty</div>';
    expect(() => mountJsonToCsvTool()).not.toThrow();
  });
});
