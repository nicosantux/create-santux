import { importSorting } from './import-sorting.js'

/** @type {import('oxfmt').OxfmtConfig} */
export default {
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  endOfLine: 'lf',
  jsxSingleQuote: true,
  printWidth: 100,
  quoteProps: 'as-needed',
  semi: false,
  singleQuote: true,
  sortImports: importSorting(['react', 'react-dom', 'react-dom/**']),
  tabWidth: 2,
  trailingComma: 'all',
  useTabs: false,
}
