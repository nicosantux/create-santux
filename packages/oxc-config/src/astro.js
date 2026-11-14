/** @type {import('oxlint').OxlintConfig} */
export default {
  env: { browser: true, node: true },
  overrides: [
    {
      files: ['**/pages/**'],
      rules: { 'check-file/folder-naming-convention': 'off', 'unicorn/filename-case': 'off' },
    },
    // Astro components are PascalCase, and the eslint package does not check .astro file names
    { files: ['**/*.astro'], rules: { 'unicorn/filename-case': 'off' } },
  ],
}
