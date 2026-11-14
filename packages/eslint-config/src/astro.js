import { createRequire } from 'node:module'

import astroPlugin from 'eslint-plugin-astro'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tsEslint from 'typescript-eslint'

// The rules of eslint-plugin-astro's `jsx-a11y-recommended` config, limited to .astro files. The
// config itself registers its own copy of the `jsx-a11y` plugin, which clashes with the React rules
const a11yRules = Object.fromEntries(
  Object.entries(jsxA11yPlugin.flatConfigs.recommended.rules).map(([name, entry]) => [
    `astro/${name}`,
    entry,
  ]),
)

// import-x parses the modules an .astro file imports with the .astro parser unless told otherwise
const tsParserPath = createRequire(import.meta.resolve('typescript-eslint')).resolve(
  '@typescript-eslint/parser',
)

export default defineConfig([
  globalIgnores(['**/.astro/**']),
  astroPlugin.configs['flat/recommended'],
  {
    files: ['**/*.astro'],
    // eslint-plugin-astro only picks the TS parser and the TS <script> processor when it finds the
    // parser hoisted to the project root, and astro-eslint-parser does not support `projectService`
    processor: 'astro/client-side-ts',
    languageOptions: {
      parserOptions: {
        parser: tsEslint.parser,
        extraFileExtensions: ['.astro'],
        project: true,
        projectService: false,
      },
    },
    settings: {
      'import-x/parsers': {
        [tsParserPath]: ['.js', '.cjs', '.mjs', '.jsx', '.ts', '.cts', '.mts', '.tsx'],
      },
    },
    rules: {
      ...a11yRules,
      // Astro types a component's props through an interface named `Props`
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['PascalCase'], selector: ['typeLike', 'enumMember'] },
        {
          custom: { match: false, regex: '^I[A-Z]|^(Interface|State)$' },
          format: ['PascalCase'],
          selector: 'interface',
        },
      ],
    },
  },
  // The <script> blocks are virtual files that no tsconfig includes, so they get no type information
  { files: ['**/*.astro/*.ts'], ...tsEslint.configs.disableTypeChecked },
  {
    files: ['**/pages/**'],
    rules: {
      'check-file/filename-naming-convention': 'off',
      'check-file/folder-naming-convention': 'off',
    },
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
])
