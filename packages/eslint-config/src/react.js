import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

/** React config block shared by the Framework entries. `extraExtends` go after the React presets. */
export function reactConfig(globals, extraExtends = []) {
  return {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    extends: [
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat['jsx-runtime'],
      reactHooksPlugin.configs.flat['recommended-latest'],
      jsxA11yPlugin.flatConfigs.recommended,
      ...extraExtends,
    ],
    languageOptions: {
      globals,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react/function-component-definition': 'warn',
      'react/hook-use-state': 'error',
      'react/jsx-boolean-value': 'warn',
      'react/jsx-curly-brace-presence': 'warn',
      'react/jsx-fragments': 'warn',
      'react/jsx-no-leaked-render': 'warn',
      'react/jsx-no-target-blank': ['error', { allowReferrer: true }],
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: true }],
      'react/jsx-sort-props': ['warn', { noSortAlphabetically: false }],
      'react/no-array-index-key': 'warn',
      'react/no-unstable-nested-components': 'error',
      'react/prop-types': 'off',
      'react/self-closing-comp': 'warn',
    },
    settings: { react: { version: '19' } },
  }
}
