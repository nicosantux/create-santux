export const PACKAGE_MANAGER = {
  bun: 'bun',
  npm: 'npm',
  pnpm: 'pnpm',
  yarn: 'yarn',
} as const

/** Lockfile names mapped to the package manager that owns them, in detection priority. */
export const LOCKFILES = {
  'pnpm-lock.yaml': 'pnpm',
  'bun.lock': 'bun',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
} as const satisfies Record<string, keyof typeof PACKAGE_MANAGER>

interface MinimumReleaseAgeConfig {
  /** The setting line that holds back versions published less than a day ago. */
  line: string
  path: string
  /** TOML table the line belongs to. */
  section?: string
  /** Matches the setting in any project config file, so a value the user already set is kept. */
  setting: RegExp
  /** First version that knows the setting. Yarn fails on settings it does not know. */
  since: string
}

/** Project config of the minimum release age, by package manager. */
export const MINIMUM_RELEASE_AGE: Record<keyof typeof PACKAGE_MANAGER, MinimumReleaseAgeConfig> = {
  bun: {
    path: 'bunfig.toml',
    section: '[install]',
    line: 'minimumReleaseAge = 86400',
    setting: /^[ \t]*minimumReleaseAge[ \t]*=[ \t]*([^\s#]*)/m,
    since: '1.3.0',
  },
  npm: {
    path: '.npmrc',
    line: 'min-release-age=1',
    // `before` is a fixed date, so it has no age to capture
    setting: /^[ \t]*(?:min-release-age[ \t]*=[ \t]*([^\s#;]*)|before[ \t]*=)/m,
    since: '11.10.0',
  },
  pnpm: {
    path: 'pnpm-workspace.yaml',
    line: 'minimumReleaseAge: 1440',
    // pnpm 10 also reads it from .npmrc
    setting: /^(?:minimumReleaseAge:|[ \t]*minimum-release-age[ \t]*=)[ \t]*([^\s#;]*)/m,
    since: '10.16.0',
  },
  yarn: {
    path: '.yarnrc.yml',
    line: 'npmMinimalAgeGate: 1440',
    setting: /^npmMinimalAgeGate:[ \t]*([^\s#]*)/m,
    since: '4.10.0',
  },
}
