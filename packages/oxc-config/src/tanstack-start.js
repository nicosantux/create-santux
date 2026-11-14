import { reactConfig } from './react.js'

const config = reactConfig({ env: { browser: true, node: true } })

/** @type {import('oxlint').OxlintConfig} */
export default {
  ...config,
  overrides: [
    {
      files: ['**/routes/**'],
      rules: { 'check-file/folder-naming-convention': 'off', 'unicorn/filename-case': 'off' },
    },
  ],
}
