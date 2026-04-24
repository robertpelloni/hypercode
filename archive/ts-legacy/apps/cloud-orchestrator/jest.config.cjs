const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@jules/shared$": "<rootDir>/packages/shared/src/index.ts",
  },
  modulePathIgnorePatterns: [
    "<rootDir>/external/",
    "<rootDir>/.next/",
    "<rootDir>/packages/shared/dist/",
  ],
  testMatch: [
    "<rootDir>/lib/**/*.test.ts",
    "<rootDir>/packages/shared/src/**/*.test.ts",
  ],
  transform: {
    ...tsJestTransformCfg,
  },
};
