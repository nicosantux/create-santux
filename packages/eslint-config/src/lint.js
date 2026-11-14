import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import checkFilePlugin from 'eslint-plugin-check-file'
import { importX } from 'eslint-plugin-import-x'
import unicornPlugin from 'eslint-plugin-unicorn'
import { defineConfig, globalIgnores } from 'eslint/config'
import tsEslint from 'typescript-eslint'

import { importOrder } from './import-order.js'

export default defineConfig([
  globalIgnores(['**/node_modules', '**/build', '**/dist']),
  // Vanilla ESLint
  {
    extends: [eslint.configs.recommended],
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-await-in-loop': 'error',
      'no-console': 'error',
      'no-else-return': 'warn',
      'no-implicit-coercion': 'error',
      'no-param-reassign': 'error',
      'no-self-compare': 'error',
      'no-undef-init': 'warn',
      'no-unneeded-ternary': 'error',
      'no-var': 'error',
      'object-shorthand': 'warn',
      'prefer-object-spread': 'warn',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'warn',
    },
  },
  // Check files
  {
    plugins: { 'check-file': checkFilePlugin },
    rules: {
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{js,jsx,ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { '**/src/**/': 'KEBAB_CASE' }],
    },
  },
  // Import order
  {
    plugins: { 'import-x': importX },
    settings: {
      'import-x/extensions': ['.js', '.jsx', '.ts', '.tsx'],
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      'import-x/first': 'error',
      'import-x/newline-after-import': 'warn',
      'import-x/no-duplicates': ['warn', { 'prefer-inline': true }],
      'import-x/no-cycle': 'error',
      'import-x/no-extraneous-dependencies': ['error', { includeTypes: true }],
      'import-x/no-mutable-exports': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/order': importOrder(['react', 'react-dom', 'react-dom/**']),
    },
  },
  // Stylistic
  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        {
          blankLine: 'any',
          prev: ['singleline-const', 'singleline-let', 'singleline-var'],
          next: ['singleline-const', 'singleline-let', 'singleline-var'],
        },
      ],
    },
  },
  // TypeScript
  {
    extends: [tsEslint.configs.strictTypeChecked, tsEslint.configs.stylisticTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      '@typescript-eslint/consistent-type-exports': [
        'warn',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      '@typescript-eslint/consistent-type-imports': ['warn', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/member-ordering': [
        'error',
        { interfaces: { order: 'natural-case-insensitive' } },
      ],
      '@typescript-eslint/method-signature-style': 'warn',
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['PascalCase'], selector: ['typeLike', 'enumMember'] },
        {
          custom: {
            match: false,
            regex: '^I[A-Z]|^(Interface|Props|State)$',
          },
          format: ['PascalCase'],
          selector: 'interface',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'warn',
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-loop-func': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-unnecessary-qualifier': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: {
            bigint: true,
            boolean: true,
            number: true,
            string: true,
          },
        },
      ],
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/triple-slash-reference': 'off',
      // After the typescript-eslint presets, which set it to error in TypeScript files
      'prefer-const': 'warn',
    },
  },
  // Disable type checked in .js files
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...tsEslint.configs.disableTypeChecked,
  },
  // Unicorn
  {
    plugins: { unicorn: unicornPlugin },
    rules: {
      'unicorn/error-message': 'error',
      'unicorn/no-empty-file': 'error',
      'unicorn/no-instanceof-builtins': 'error',
      'unicorn/no-useless-spread': 'warn',
      'unicorn/prefer-array-flat-map': 'warn',
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/throw-new-error': 'error',
    },
  },
  // Prettier
  eslintConfigPrettier,
])
