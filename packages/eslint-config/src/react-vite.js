import reactRefreshPlugin from 'eslint-plugin-react-refresh'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

import { importOrder } from './import-order.js'
import { reactConfig } from './react.js'

export default defineConfig([
  {
    rules: {
      'import-x/order': importOrder(['react', 'react-dom', 'react-dom/**']),
    },
  },
  reactConfig(globals.browser, [reactRefreshPlugin.configs.vite]),
])
