import nextPlugin from '@next/eslint-plugin-next'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

import { importOrder } from './import-order.js'
import { reactConfig } from './react.js'

export default defineConfig([
  globalIgnores(['**/.next/**', '**/out/**', '**/next-env.d.ts']),
  {
    rules: {
      'check-file/folder-naming-convention': ['error', { '**/src/**/': 'NEXT_JS_APP_ROUTER_CASE' }],
      'import-x/order': importOrder(['next', 'next/**', 'react', 'react-dom', 'react-dom/**']),
    },
  },
  nextPlugin.configs['core-web-vitals'],
  reactConfig({ ...globals.browser, ...globals.node }),
])
