import santux from '@santux/oxc-config/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [santux],
  ignorePatterns: ['**/build', '**/dist'],
})
