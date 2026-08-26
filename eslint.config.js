import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist/**', '.venv/**', 'frontend/dist/**', 'dataset/**', 'backend/**']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        api: 'readonly',
        showToast: 'readonly',
        Auth: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['src/hooks/**/*.{js,jsx}', 'frontend/src/hooks/**/*.{js,jsx}', 'src/pages/ai/NetworkGraphView.jsx', 'frontend/src/pages/ai/NetworkGraphView.jsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: [
      'src/components/ConcernBadge.jsx', 'frontend/src/components/ConcernBadge.jsx',
      'src/components/RiskBadge.jsx', 'frontend/src/components/RiskBadge.jsx',
      'src/contexts/AuthContext.jsx', 'frontend/src/contexts/AuthContext.jsx'
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['frontend/js/**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
])
