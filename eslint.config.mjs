import js from "@eslint/js"
import tsParser from "@typescript-eslint/parser"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import reactPlugin from "eslint-plugin-react"
import prettierPlugin from "eslint-plugin-prettier"
import prettierConfig from "eslint-config-prettier"
import globals from "globals"

export default [
  js.configs.recommended,
  {
    ignores: [
      `node_modules/**`,
      `dist/**`,
      `build/**`,
      `.output/**`,
      `src/routeTree.gen.ts`,
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: `module`,
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: `detect`,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": `error`,
      "react/react-in-jsx-scope": `off`,
      "react/jsx-uses-react": `off`,
      "no-undef": `off`,
    },
  },
]
