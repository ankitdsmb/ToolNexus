export default {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/js/setup-jest.js'],
  collectCoverageFrom: [
    'src/ToolNexus.Web/wwwroot/js/tools/base64-decode.js',
    'src/ToolNexus.Web/wwwroot/js/tools/base64-encode.js',
    'src/ToolNexus.Web/wwwroot/js/tools/case-converter.js',
    'src/ToolNexus.Web/wwwroot/js/tools/css-minifier.js',
    'src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.js',
    'src/ToolNexus.Web/wwwroot/js/tools/csv-viewer.js',
    'src/ToolNexus.Web/wwwroot/js/tools/html-entities.js',
    'src/ToolNexus.Web/wwwroot/js/tools/html-to-markdown.js',
    'src/ToolNexus.Web/wwwroot/js/tools/js-minifier.js',
    'src/ToolNexus.Web/wwwroot/js/tools/json-to-csv.js',
    'src/ToolNexus.Web/wwwroot/js/tools/json-to-xml.js',
    'src/ToolNexus.Web/wwwroot/js/tools/json-to-yaml.js',
    'src/ToolNexus.Web/wwwroot/js/tools/json-validator.js',
    'src/ToolNexus.Web/wwwroot/js/tools/markdown-to-html.js',
    'src/ToolNexus.Web/wwwroot/js/tools/regex-tester.js',
    'src/ToolNexus.Web/wwwroot/js/tools/sql-formatter.js',
    'src/ToolNexus.Web/wwwroot/js/tools/url-decode.js',
    'src/ToolNexus.Web/wwwroot/js/tools/url-encode.js',
    'src/ToolNexus.Web/wwwroot/js/tools/xml-formatter.js',
    'src/ToolNexus.Web/wwwroot/js/tools/yaml-to-json.js'
  ]
};
