import { createUrlEncoderApp, runClientUrlEncode } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-encode.app.js';
import { runTool } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-encode.js';

function setupDom() {
  document.body.innerHTML = `<section class="url-encode-tool">
    <textarea id="inputEditor"></textarea>
    <textarea id="outputEditor"></textarea>
    <select id="modeSelect"><option value="component" selected>component</option></select>
    <input id="plusSpaceToggle" type="checkbox" />
    <input id="autoEncodeToggle" type="checkbox" />
    <button id="encodeBtn">Encode</button>
    <button id="clearBtn">Clear</button>
    <button id="copyBtn">Copy</button>
    <div id="statusText"></div>
    <div id="inputStats"></div>
    <div id="outputStats"></div>
    <section id="errorBox" hidden>
      <h2 id="errorTitle"></h2>
      <p id="errorMessage"></p>
      <p id="errorAction"></p>
    </section>
    <div id="loadingState" hidden></div>
  </section>`;

  return document.querySelector('.url-encode-tool');
}

describe('url-encode run APIs', () => {
  test('runTool encodes values and rejects unsupported actions', async () => {
    await expect(runTool('encode', 'a b')).resolves.toBe('a%20b');
    await expect(runTool('decode', 'a%20b')).rejects.toThrow('Unsupported action');
  });

  test('runClientUrlEncode validates empty input and supports query values mode', () => {
    expect(() => runClientUrlEncode('')).toThrow('Input must not be empty.');
    expect(runClientUrlEncode('name=John Doe&city=New York', { mode: 'query-values', spaceEncoding: 'plus' })).toBe('name=John+Doe&city=New+York');
  });
});

describe('url-encode dom behavior', () => {
  test('createUrlEncoderApp is idempotent per root and keyboard shortcut is scoped to tool root', () => {
    const root = setupDom();
    const appA = createUrlEncoderApp(root);
    const appB = createUrlEncoderApp(root);

    expect(appA).toBe(appB);

    const input = document.getElementById('inputEditor');
    const output = document.getElementById('outputEditor');

    input.value = 'alpha beta';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('encodeBtn').click();
    expect(output.value).toBe('alpha%20beta');

    const outsideInput = document.createElement('input');
    document.body.appendChild(outsideInput);
    outsideInput.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));
    expect(input.value).toBe('alpha beta');

    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));
    expect(input.value).toBe('');
    expect(output.value).toBe('');
  });
});
