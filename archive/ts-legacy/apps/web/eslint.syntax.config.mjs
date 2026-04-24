import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.{ts,tsx,js,mjs,cjs}"],
    plugins: {
      "react-hooks": {
        rules: {
          "exhaustive-deps": {
            create: () => ({})
          }
        }
      },
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
