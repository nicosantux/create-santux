import type { Snapshot } from '../core/types.js'

import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { execa } from 'execa'

import { CONFLICT_FILE_PATHS } from '../constants/conflicts.js'
import { LOCKFILES, MINIMUM_RELEASE_AGE } from '../constants/package-manager.js'
import { TOOLCHAIN_CONFIG_PATHS, TOOLCHAIN_PACKAGE } from '../constants/toolchains.js'
import { TOOLING_FILE_PATHS } from '../core/plan.js'

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  )

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  prettier?: unknown
  scripts?: Record<string, string>
  type?: string
}

const TSCONFIG_PATHS = ['tsconfig.json', 'tsconfig.app.json']

const VITE_CONFIG_PATHS = ['ts', 'mts', 'js', 'mjs', 'cts', 'cjs'].map(
  (ext) => `vite.config.${ext}`,
)

async function readExisting(cwd: string, paths: readonly string[]) {
  const files = await Promise.all(
    paths.map(async (path) => {
      const content = await readFile(join(cwd, path), 'utf8').catch(() => null)

      return content === null ? null : { content, path }
    }),
  )

  return files.filter((file) => file !== null)
}

async function listHuskyFiles(cwd: string) {
  const entries = await readdir(join(cwd, '.husky'), { withFileTypes: true }).catch(() => [])

  return entries.filter((entry) => entry.isFile()).map((entry) => `.husky/${entry.name}`)
}

/** Reads the facts about the Target project that the planning core needs. */
export async function inspectProject(cwd: string): Promise<Snapshot> {
  const findExisting = async (paths: readonly string[]) =>
    (
      await Promise.all(paths.map(async (path) => ((await exists(join(cwd, path))) ? path : null)))
    ).filter((path) => path !== null)

  const [
    toolingFiles,
    conflictFiles,
    lockfiles,
    hasPackageJson,
    huskyFiles,
    hasSrcDirectory,
    tsconfigs,
    viteConfigs,
    packageManagerConfigs,
  ] = await Promise.all([
    findExisting(TOOLING_FILE_PATHS),
    findExisting(CONFLICT_FILE_PATHS.filter((path) => !TOOLING_FILE_PATHS.includes(path))),
    findExisting(Object.keys(LOCKFILES)),
    exists(join(cwd, 'package.json')),
    listHuskyFiles(cwd),
    exists(join(cwd, 'src')),
    readExisting(cwd, TSCONFIG_PATHS),
    readExisting(cwd, VITE_CONFIG_PATHS),
    readExisting(
      cwd,
      Object.values(MINIMUM_RELEASE_AGE).map(({ path }) => path),
    ),
  ])

  const packageJson = hasPackageJson
    ? (JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8')) as PackageJson)
    : null

  const configs = Object.fromEntries(
    await Promise.all(
      Object.values(TOOLCHAIN_CONFIG_PATHS)
        .flat()
        .filter((path) => toolingFiles.includes(path))
        .map(async (path) => [path, await readFile(join(cwd, path), 'utf8')] as const),
    ),
  )

  const isOurs = (content: string) =>
    Object.values(TOOLCHAIN_PACKAGE).some((name) => content.includes(name))

  const foreignConfigs = Object.keys(configs).filter((path) => !isOurs(configs[path] ?? ''))

  const installedTypescript = await readFile(
    join(cwd, 'node_modules/typescript/package.json'),
    'utf8',
  ).then(
    (raw) => (JSON.parse(raw) as { version?: string }).version,
    () => undefined,
  )

  // shortcut: only the root is checked, extend to nested folders if CommonJS breakage shows up there
  const rootJsFiles = (await readdir(cwd, { withFileTypes: true }))
    .map((entry) => (entry.isFile() ? entry.name : ''))
    .filter(
      (name) =>
        name.endsWith('.js') &&
        !TOOLING_FILE_PATHS.includes(name) &&
        !CONFLICT_FILE_PATHS.includes(name),
    )

  const { exitCode } = await execa('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd,
    reject: false,
  })

  const dependencyVersions = { ...packageJson?.dependencies, ...packageJson?.devDependencies }

  return {
    conflictFiles: [...conflictFiles, ...foreignConfigs],
    dependencies: Object.keys(dependencyVersions),
    dependencyVersions,
    existingFiles: toolingFiles.filter((path) => !foreignConfigs.includes(path)),
    hasGit: exitCode === 0,
    hasPackageJson,
    hasPrettierKey: packageJson?.prettier !== undefined,
    hasSrcDirectory,
    huskyFiles,
    isModule: packageJson?.type === 'module',
    lockfiles,
    packageManagerConfigs: Object.fromEntries(
      packageManagerConfigs.map(({ content, path }) => [path, content]),
    ),
    productionDependencies: Object.keys(packageJson?.dependencies ?? {}),
    rootJsFiles,
    scripts: packageJson?.scripts ?? {},
    toolchainConfigs: Object.fromEntries(
      Object.entries(configs).filter(([, content]) => isOurs(content)),
    ),
    tsconfigs: Object.fromEntries(tsconfigs.map(({ content, path }) => [path, content])),
    typescriptVersion:
      installedTypescript ??
      packageJson?.devDependencies?.typescript ??
      packageJson?.dependencies?.typescript ??
      null,
    userAgent: process.env.npm_config_user_agent,
    viteConfig: viteConfigs[0] ?? null,
  }
}
