import { jest } from '@jest/globals';
import { runTool as runBase64Decode } from '../../src/ToolNexus.Web/wwwroot/js/tools/base64-decode.js';
import { runTool as runBase64Encode } from '../../src/ToolNexus.Web/wwwroot/js/tools/base64-encode.js';
import { runTool as runCaseConverter } from '../../src/ToolNexus.Web/wwwroot/js/tools/case-converter.js';
import { runTool as runCssMinifier } from '../../src/ToolNexus.Web/wwwroot/js/tools/css-minifier.js';
import { runTool as runCsvViewer } from '../../src/ToolNexus.Web/wwwroot/js/tools/csv-viewer.js';
import { runTool as runHtmlEntities } from '../../src/ToolNexus.Web/wwwroot/js/tools/html-entities.js';
import { runTool as runHtmlToMarkdown } from '../../src/ToolNexus.Web/wwwroot/js/tools/html-to-markdown.js';
import { runTool as runJsonToXml } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-to-xml.js';
import { runTool as runJsonToYaml } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-to-yaml.js';
import { runTool as runJsonValidator } from '../../src/ToolNexus.Web/wwwroot/js/tools/json-validator.js';
import { runTool as runMarkdownToHtml } from '../../src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.js';
import { runTool as runSqlFormatter } from '../../src/ToolNexus.Web/wwwroot/js/tools/sql-formatter.js';
import { runTool as runUrlDecode } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-decode.js';
import { runTool as runUrlEncode } from '../../src/ToolNexus.Web/wwwroot/js/tools/url-encode.js';
import { runTool as runXmlFormatter } from '../../src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.js';
import { runTool as runYamlToJson } from '../../src/ToolNexus.Web/wwwroot/js/tools/yaml-to-json.js';

const TOOL_CASES = [
  { name: 'base64-decode', runTool: runBase64Decode, action: 'decode', input: 'aGVsbG8=', largeInput: btoa('x'.repeat(12000)) },
  { name: 'base64-encode', runTool: runBase64Encode, action: 'encode', input: 'Hello 世界 😀', largeInput: 'a'.repeat(12000) },
  { name: 'case-converter', runTool: runCaseConverter, action: 'camel-case', input: 'user API response', largeInput: 'word '.repeat(4000) },
  { name: 'css-minifier', runTool: runCssMinifier, action: 'minify', input: 'body { color: red; }', largeInput: '.a { color: #fff; }\n'.repeat(1000) },
  { name: 'csv-viewer', runTool: runCsvViewer, action: 'preview', input: 'name,city\nAda,Tokyo', largeInput: `a,b\n${'1,2\n'.repeat(2000)}` },
  { name: 'html-entities', runTool: runHtmlEntities, action: 'encode', input: '<h1>ToolNexus & "test"</h1>', largeInput: '<div>safe & data</div>'.repeat(5000) },
  { name: 'html-to-markdown', runTool: runHtmlToMarkdown, action: 'convert', input: '<h1>Header</h1><p>Paragraph</p>', largeInput: '<p>row</p>'.repeat(4000) },
  { name: 'json-to-xml', runTool: runJsonToXml, action: 'convert', input: '{"user":{"name":"Ada"}}', largeInput: JSON.stringify({ rows: Array.from({ length: 200 }, (_, i) => ({ id: i, text: 'x'.repeat(20) })) }) },
  { name: 'json-to-yaml', runTool: runJsonToYaml, action: 'convert', input: '{"name":"Ada","city":"東京"}', largeInput: JSON.stringify({ rows: Array.from({ length: 400 }, (_, i) => ({ index: i })) }) },
  { name: 'json-validator', runTool: runJsonValidator, action: 'validate', input: '{"valid":true}', largeInput: JSON.stringify({ payload: 'x'.repeat(30000) }) },
  { name: 'markdown-to-html', runTool: runMarkdownToHtml, action: 'convert', input: '# Title\n\n- one\n- two', largeInput: '# header\n\n'.repeat(5000) },
  { name: 'sql-formatter', runTool: runSqlFormatter, action: 'format', input: 'select id,name from users where active=1', largeInput: 'select id,name from users where active=1;\n'.repeat(1000) },
  { name: 'url-decode', runTool: runUrlDecode, action: 'decode', input: 'https%3A%2F%2Fexample.com%2F%3Fq%3Dhello%2520world', largeInput: encodeURIComponent('x'.repeat(15000)) },
  { name: 'url-encode', runTool: runUrlEncode, action: 'encode', input: 'https://example.com/?q=привет world', largeInput: 'input with spaces/'.repeat(3000) },
  { name: 'xml-formatter', runTool: runXmlFormatter, action: 'format', input: '<root><item>1</item></root>', largeInput: `<root>${'<a>1</a>'.repeat(1500)}</root>` },
  { name: 'yaml-to-json', runTool: runYamlToJson, action: 'convert', input: 'name: Ada\ncity: 東京', largeInput: Array.from({ length: 1200 }, (_, i) => `k${i}: v${i}`).join('\n') }
];

const settle = (runTool, action, input, options) => Promise.resolve().then(() => runTool(action, input, options));

describe('remaining tools runTool coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="statusText"></div><div id="errorBox"></div><div id="errorTitle"></div><div id="errorMessage"></div><div id="errorAction"></div>';
    global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();
  });

  test.each(TOOL_CASES)('$name should process deterministic valid input', async ({ runTool, action, input }) => {
    const a = await settle(runTool, action, input);
    const b = await settle(runTool, action, input);
    expect(a).toEqual(b);
  });

  test.each(TOOL_CASES)('$name should handle invalid and malicious payloads gracefully', async ({ runTool, action }) => {
    const malicious = '<script>alert("xss")</script> OR 1=1; DROP TABLE users; 😀';
    const outcomes = await Promise.allSettled([
      settle(runTool, action, ''),
      settle(runTool, action, '   '),
      settle(runTool, action, null),
      settle(runTool, action, undefined),
      settle(runTool, action, malicious),
      settle(runTool, 'unsupported-action', 'sample')
    ]);

    expect(outcomes).toHaveLength(6);
    outcomes.forEach((entry) => {
      if (entry.status === 'rejected') {
        expect(entry.reason).toBeInstanceOf(Error);
      } else {
        expect(entry.status).toBe('fulfilled');
      }
    });
  });


  test('case-converter falls back to lowercase for unsupported actions', async () => {
    const input = 'Hello API-Response';
    const expected = await settle(runCaseConverter, 'lowercase', input);
    const actual = await settle(runCaseConverter, 'unsupported-action', input);

    expect(actual).toBe(expected);
    expect(actual).toBe('hello api-response');
  });
  test.each(TOOL_CASES)('$name should complete large payload processing', async ({ runTool, action, largeInput }) => {
    const started = Date.now();
    const result = await settle(runTool, action, largeInput);
    expect(result).toBeDefined();
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
