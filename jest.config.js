export default {
  testEnvironment: 'jsdom',
  setupFiles: ['./jest.setup.js'],
  testMatch: ['<rootDir>/tests/js/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', 'tool-test-helpers.js'],
  modulePathIgnorePatterns: ['<rootDir>/src/ToolNexus.Web/bin/', '<rootDir>/tests/ToolNexus.Web.Tests/bin/', '<rootDir>/tests/.*/bin/', '<rootDir>/.*/obj/'],
  moduleNameMapper: {
    '^/js/(.*)$': '<rootDir>/src/ToolNexus.Web/wwwroot/js/$1'
  },
  collectCoverageFrom: [
    'src/ToolNexus.Web/wwwroot/js/tools/case-converter.js',
    'src/ToolNexus.Web/wwwroot/js/tools/tool-platform-kernel.js',
    'src/ToolNexus.Web/wwwroot/js/tools/keyboard-event-manager.js'
  ]
};
