import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Dev-only HMR hint — does not affect production builds.
      'react-refresh/only-export-components': 'off',
      // Many valid patterns sync UI state from props/query data in effects.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['e2e/**/*.ts'],
    rules: {
      // Playwright fixtures use `use`, not React's use hook.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
])
