import type { Config } from 'jest';

/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],

  // ignore testing original files (only test refactored ones)
  testPathIgnorePatterns: ['/node_modules/'],

  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // A set of global variables that need to be available in all test environments
  // globals: {},

  // Indicates whether each individual test should be reported during the run
  verbose: true,
  silent: true,
};

export default config;
