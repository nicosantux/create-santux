/** oxfmt `sortImports` options. Packages in `reactPackages` are grouped before the other builtins. */
export function importSorting(reactPackages) {
  return {
    customGroups: [
      { groupName: 'react', modifiers: ['value'], elementNamePattern: reactPackages },
      { groupName: 'alias', modifiers: ['value'], elementNamePattern: ['@/**'] },
    ],
    groups: [
      'type',
      'react',
      'builtin',
      'external',
      'internal',
      'alias',
      'parent',
      'sibling',
      'index',
      'unknown',
    ],
    ignoreCase: true,
    newlinesBetween: true,
    order: 'asc',
    sortSideEffects: true,
  }
}
