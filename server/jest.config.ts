import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
};

export default config;