import path from "node:path";
import { fileURLToPath } from "node:url";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  eslintPluginPrettierRecommended,

  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ["./packages/*/tsconfig.json", "./tsconfig.json"],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/prefer-string-starts-ends-with": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/dot-notation": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },

  ...eslintPluginAstro.configs["flat/recommended"],
];
