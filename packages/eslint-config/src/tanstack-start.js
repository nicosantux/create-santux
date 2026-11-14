import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

import { importOrder } from './import-order.js'
import { reactConfig } from './react.js'

export default defineConfig([
  globalIgnores(['**/.output/**', '**/.tanstack/**', '**/routeTree.gen.ts']),
  {
    rules: {
      'import-x/order': importOrder(['react', 'react-dom', 'react-dom/**']),
    },
  },
  {
    files: ['**/routes/**'],
    rules: {
      'check-file/filename-naming-convention': 'off',
      'check-file/folder-naming-convention': 'off',
    },
  },
  reactConfig({ ...globals.browser, ...globals.node }),
])
