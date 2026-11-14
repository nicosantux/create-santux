import { defineConfig } from 'tsdown'

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  fixedExtension: false,
  minify: !options.watch,
  outDir: 'build',
}))
