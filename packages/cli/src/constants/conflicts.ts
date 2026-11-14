const JS_EXTENSIONS = ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts']

/** Config files of other lint and format tools. The ones our Tooling layer writes are not listed here. */
export const CONFLICT_FILE_PATHS = [
  ...JS_EXTENSIONS.map((extension) => `eslint.config.${extension}`),
  '.eslintrc',
  ...['js', 'cjs', 'mjs', 'json', 'yaml', 'yml'].map((extension) => `.eslintrc.${extension}`),
  '.eslintignore',
  '.prettierrc',
  ...['json', 'json5', 'yaml', 'yml', 'toml', ...JS_EXTENSIONS].map(
    (extension) => `.prettierrc.${extension}`,
  ),
  ...JS_EXTENSIONS.map((extension) => `prettier.config.${extension}`),
  'biome.json',
  'biome.jsonc',
  '.oxlintrc.json',
  ...['ts', 'mts'].map((extension) => `oxlint.config.${extension}`),
  '.oxfmtrc.json',
  '.oxfmtrc.jsonc',
  ...['ts', 'mts'].map((extension) => `oxfmt.config.${extension}`),
  '.commitlintrc',
  ...['json', 'yaml', 'yml', ...JS_EXTENSIONS].map((extension) => `.commitlintrc.${extension}`),
  ...JS_EXTENSIONS.map((extension) => `commitlint.config.${extension}`),
]

/** Dependencies that belong to another lint or format setup. */
export const CONFLICT_DEPENDENCY =
  /^(?:eslint|prettier|oxlint|oxlint-tsgolint|oxfmt|typescript-eslint|@biomejs\/biome)$|^(?:eslint-|prettier-|@eslint\/|@prettier\/|@typescript-eslint\/)|^@[^/]+\/eslint-(?:plugin|config)/
