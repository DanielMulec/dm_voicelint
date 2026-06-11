import js from "@eslint/js";
import tseslint from "typescript-eslint";

const typedFiles = ["src/**/*.ts", "test/**/*.ts", "vitest.config.ts"];
const scriptFiles = ["bin/**/*.mjs", "scripts/**/*.mjs", "eslint.config.js"];

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    files: typedFiles,
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      complexity: ["error", 3],
      "no-undef": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: scriptFiles,
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      complexity: ["error", 3],
    },
  },
);
