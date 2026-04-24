module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  ignorePatterns: [
    "**/dist/**",
    "**/.next/**",
    "**/node_modules/**",
    "**/coverage/**",
    "**/*.d.ts",
  ],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-empty": "off",
  },
};
