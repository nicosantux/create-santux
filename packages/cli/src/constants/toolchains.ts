/** Toolchains mapped to the config package that carries their opinions. */
export const TOOLCHAIN_PACKAGE = {
  eslint: '@santux/eslint-config',
  oxc: '@santux/oxc-config',
} as const

/** Lint and format config files of each Toolchain. They count as ours only when they import its package. */
export const TOOLCHAIN_CONFIG_PATHS: Record<
  keyof typeof TOOLCHAIN_PACKAGE,
  readonly [lint: string, format: string]
> = {
  eslint: ['eslint.config.js', 'prettier.config.js'],
  oxc: ['oxlint.config.ts', 'oxfmt.config.ts'],
}
