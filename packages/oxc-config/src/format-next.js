import { importSorting } from './import-sorting.js'

/** @type {import('oxfmt').OxfmtConfig} */
export default {
  sortImports: importSorting(['next', 'next/**', 'react', 'react-dom', 'react-dom/**']),
}
