import { plugin as shadcnPlugin } from '@shadcn/lint'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: { shadcn: shadcnPlugin },
    rules: {
      'shadcn/no-arbitrary-values': 'error',
      'shadcn/no-inline-styles': 'error',
      'shadcn/no-raw-colors': 'error',
      'shadcn/no-restyle': 'error',
      'shadcn/no-unknown-classes': 'error',
    },
  },
])
