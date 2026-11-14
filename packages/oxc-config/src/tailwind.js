import { jsPlugin } from './js-plugins.js'

/** @type {import('oxlint').OxlintConfig} */
export default {
  jsPlugins: [jsPlugin('shadcn', '@shadcn/lint')],
  rules: {
    'shadcn/no-arbitrary-values': 'error',
    'shadcn/no-inline-styles': 'error',
    'shadcn/no-raw-colors': 'error',
    'shadcn/no-restyle': 'error',
    'shadcn/no-unknown-classes': 'error',
  },
}
