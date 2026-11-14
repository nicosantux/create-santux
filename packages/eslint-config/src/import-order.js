/** `import-x/order` options. Packages in `earlyPackages` are grouped before the other builtins. */
export function importOrder(earlyPackages) {
  return [
    'warn',
    {
      alphabetize: { order: 'asc', caseInsensitive: true },
      groups: ['type', 'builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      pathGroups: [
        { pattern: '@/**', group: 'internal', position: 'after' },
        { pattern: `{${earlyPackages.join(',')}}`, group: 'builtin', position: 'before' },
      ],
      pathGroupsExcludedImportTypes: ['builtin', 'internal'],
      warnOnUnassignedImports: true,
    },
  ]
}
