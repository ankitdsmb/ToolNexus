export default {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/ToolNexus.Web/wwwroot/js/tools/csv-to-json.js'
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
