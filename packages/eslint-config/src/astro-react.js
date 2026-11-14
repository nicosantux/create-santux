import { defineConfig } from 'eslint/config'
import globals from 'globals'

import { reactConfig } from './react.js'

export default defineConfig([{ ...reactConfig(globals.browser), files: ['**/*.{jsx,tsx}'] }])
