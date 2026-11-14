import { reactConfig } from './react.js'

/** @type {import('oxlint').OxlintConfig} */
export default reactConfig({
  env: { browser: true },
  rules: { 'react/only-export-components': ['error', { allowConstantExport: true }] },
})
