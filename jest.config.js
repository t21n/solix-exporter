/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  roots: ['src', 'test'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**'],
  setupFilesAfterEnv: ['jest-extended/all'],
  transformIgnorePatterns: [
    'node_modules/(?!(string-width|strip-ansi|ansi-regex|test-json-import)/)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@t21n/solix-api$': '<rootDir>/../solix-api/src/index',
  },
};
