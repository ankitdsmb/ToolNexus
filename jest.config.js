export default {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.js',
    'src/ToolNexus.Web/wwwroot/js/tools/regex-tester.js',
    'src/ToolNexus.Web/wwwroot/js/tools/json-to-csv.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
