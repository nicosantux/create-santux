import { reactConfig } from './react.js'

// oxlint `overrides` do not accept `settings`
const { settings, ...config } = reactConfig({ env: { browser: true } })

/** @type {import('oxlint').OxlintConfig} */
export default { settings, overrides: [{ files: ['**/*.{jsx,tsx}'], ...config }] }
