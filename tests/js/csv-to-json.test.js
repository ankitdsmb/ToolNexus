import { jest } from '@jest/globals';
import {
  CsvParseError,
  coerceValue,
  convertCsvToJson,
  destroyCsvToJsonApp,
  formatError,
  initCsvToJsonApp,
  normalizeHeaders,
  parseCsvRecords,
  parseCustomHeaders,
  runTool,
  transformRowsToObjects
} from '../../src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.js';
import { getKeyboardEventManager, resetKeyboardEventManagerForTesting } from '../../src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js';
import { getToolPlatformKernel, resetToolPlatformKernelForTesting } from '../../src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js';

const buildDom = (autoConvert = false) => {
  document.body.innerHTML = `<div class="tool csv-json-page" data-tool="csv-to-json">
    <button id="convertBtn"></button><button id="clearBtn"></button><button id="copyBtn"></button><button id="downloadBtn"></button>
    <select id="delimiterSelect"><option value="," selected>,</option><option value="\t">tab</option></select>
    <input id="useHeaderToggle" type="checkbox" checked />
    <div id="customHeadersField" hidden></div><input id="customHeadersInput" />
    <input id="autoConvertToggle" type="checkbox" ${autoConvert ? 'checked' : ''} />
    <input id="prettyToggle" type="checkbox" checked /><select id="indentSelect"><option value="2" selected>2</option></select>
    <input id="typeDetectToggle" type="checkbox" checked /><input id="emptyAsNullToggle" type="checkbox" checked />
    <input id="sanitizeToggle" type="checkbox" /><input id="previewRowsInput" value="1" />
    <div id="statusText"></div><div id="errorBox" hidden></div><textarea id="csvInput"></textarea><textarea id="jsonOutput"></textarea>
    <div id="rowCount"></div><div id="charCount"></div></div>`;
  global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
  global.URL.createObjectURL = jest.fn(() => 'blob:abc');
  global.URL.revokeObjectURL = jest.fn();
};

beforeEach(() => {
  resetToolPlatformKernelForTesting();
  resetKeyboardEventManagerForTesting();
});

describe('csv-to-json core logic', () => {
  test('normalization and parser edge cases', () => {
    expect(normalizeHeaders(['id', 'id', ' ', null])).toEqual(['id', 'id_2', 'column_3', 'column_4']);
    expect(parseCustomHeaders(' name, name , ')).toEqual(['name', 'name_2', 'column_3']);
    expect(parseCustomHeaders(' ')).toEqual([]);
    expect(parseCsvRecords('a,b\r\n1,2', ',')).toEqual([['a', 'b'], ['1', '2']]);
    expect(() => parseCsvRecords(undefined, ',')).toThrow('CSV input must be a string.');
    expect(() => parseCsvRecords('a,b\n"oops', ',')).toThrow(CsvParseError);
  });

  test('coerce, transform and formatting branches', async () => {
    expect(coerceValue('', true, true, false)).toBeNull();
    expect(coerceValue('false', true, false, false)).toBe(false);
    expect(coerceValue(' 10.5 ', true, false, false)).toBe(10.5);
    expect(coerceValue('=SUM(A1:A2)', true, false, true)).toBe("'=SUM(A1:A2)");
    expect(formatError(new CsvParseError('bad', 3))).toContain('Approximate row: 3');
    expect(formatError({})).toContain('Unable to convert CSV input');

    await expect(transformRowsToObjects([], { useHeaderRow: true, customHeaders: [], typeDetection: true, emptyAsNull: true, sanitizeFormulas: false }))
      .resolves.toEqual({ records: [], headers: [] });

    const generated = await transformRowsToObjects([['x', 'y']], {
      useHeaderRow: false, customHeaders: [], typeDetection: false, emptyAsNull: false, sanitizeFormulas: false
    });
    expect(generated.headers).toEqual(['column_1', 'column_2']);
  });

  test('conversion determinism and action validation', async () => {
    const result = await convertCsvToJson('id,enabled\n1,true\n2,false', {
      delimiter: ',', useHeaderRow: true, customHeaders: [], pretty: false, indent: 2,
      typeDetection: true, emptyAsNull: true, sanitizeFormulas: false, previewRows: 1
    });
    expect(result.json).toBe('[{"id":1,"enabled":true}]');

    await expect(runTool('format', 'a,b')).rejects.toThrow('Unsupported action');
    const payload = 'name,city\n"Åsa","東京"\n"Emoji 😀","München"';
    await expect(runTool('convert', payload)).resolves.toEqual(await runTool('convert', payload));
  });
});

describe('csv-to-json lifecycle behavior', () => {
  test('idempotent init, convert, copy, download, clear and shortcuts', async () => {
    buildDom();
    initCsvToJsonApp(document);
    initCsvToJsonApp(document);

    const csvInput = document.getElementById('csvInput');
    csvInput.value = 'a,b\n1,2';
    csvInput.focus();
    csvInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));

    document.getElementById('convertBtn').click();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById('jsonOutput').value).toContain('"a": 1');

    document.getElementById('copyBtn').click();
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    document.getElementById('downloadBtn').click();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));
    expect(csvInput.value).toBe('');
  });

  test('remount stress x50 and cleanup', () => {
    buildDom();
    const root = document.querySelector('[data-tool="csv-to-json"]');

    for (let index = 0; index < 50; index += 1) {
      initCsvToJsonApp(document);
      destroyCsvToJsonApp(document);
    }

    expect(getToolPlatformKernel().getLifecycleState('csv-to-json', root)).toBe('missing');
    expect(getKeyboardEventManager().getRegisteredHandlerCount()).toBe(0);
  });

  test('error, auto-convert, empty-input and guard branches', async () => {
    buildDom(true);
    initCsvToJsonApp(document);

    const csvInput = document.getElementById('csvInput');
    csvInput.focus();
    csvInput.value = 'a,b\n"oops';
    csvInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    document.getElementById('convertBtn').click();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById('errorBox').hidden).toBe(false);

    document.getElementById('copyBtn').dispatchEvent(new Event('click', { bubbles: true }));
    document.getElementById('downloadBtn').dispatchEvent(new Event('click', { bubbles: true }));

    csvInput.value = 'a\n1';
    document.getElementById('useHeaderToggle').checked = false;
    document.getElementById('useHeaderToggle').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById('customHeadersField').hidden).toBe(false);

    csvInput.value = '';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.getElementById('statusText').textContent).toBe('Input is empty.');
  });

  test('safe no-op without root', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => initCsvToJsonApp(document)).not.toThrow();
  });
});
