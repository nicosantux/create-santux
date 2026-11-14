import type {
  Addon,
  Choices,
  Environment,
  Framework,
  Operation,
  PackageManager,
  Plan,
  Snapshot,
  Toolchain,
  ToolchainMetadata,
} from './types.js'

import { CONFLICT_DEPENDENCY } from '../constants/conflicts.js'
import {
  ADDON_LINT_ENTRY,
  ADDON_PEERS,
  FORMAT_IGNORE_PATTERNS,
  FRAMEWORK_PEERS,
  OXLINT_IGNORE_PATTERNS,
} from '../constants/frameworks.js'
import { LOCKFILES, MINIMUM_RELEASE_AGE } from '../constants/package-manager.js'
import { TOOLCHAIN_CONFIG_PATHS, TOOLCHAIN_PACKAGE } from '../constants/toolchains.js'
import { TYPESCRIPT_7_ALIAS, TYPESCRIPT_COMPAT_PACKAGE } from '../constants/typescript.js'

import { planAlias } from './alias.js'

const EDITORCONFIG = `root = true

[*]
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
max_line_length = 100
`

const SCRIPTS: Record<Toolchain, Record<string, string>> = {
  eslint: {
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
    format: 'prettier . --check',
    'format:fix': 'prettier . --write',
    prepare: 'husky',
  },
  oxc: {
    lint: 'oxlint',
    'lint:fix': 'oxlint --fix',
    format: 'oxfmt --check',
    'format:fix': 'oxfmt',
    prepare: 'husky',
  },
}

function reexport(toolchain: Toolchain, entry: string) {
  return `export { default } from '${TOOLCHAIN_PACKAGE[toolchain]}/${entry}'\n`
}

const camelCase = (name: string) =>
  name.replaceAll(/-(\w)/g, (_, letter: string) => letter.toUpperCase())

function getNodeVersion({ nodeLts, nodeVersion }: Environment) {
  return `${nodeLts ?? String(Number.parseInt(nodeVersion.replace(/^v/, ''), 10))}\n`
}

const HUSKY_HOOK_PATH = '.husky/commit-msg'

const COMMITLINT_CONFIG_PATH = 'commitlint.config.js'

/** Lint entries of the selected Framework and Add-ons, in composition order. */
const lintEntries = (framework: Framework | null, addons: Addon[]) => [
  ...(framework ? [framework] : []),
  ...addons.map((addon) => ADDON_LINT_ENTRY[addon]),
]

/** Format entry of each Framework and Add-on that has one, by Toolchain. */
const FORMAT_ENTRIES: Record<Toolchain, Partial<Record<Addon | Framework, string>>> = {
  eslint: { astro: 'format-astro', tailwind: 'format-tailwind' },
  oxc: { next: 'format-next', astro: 'format-astro', tailwind: 'format-tailwind' },
}

/** Format entries of the selected Framework and Add-ons, in composition order. */
const formatEntries = (toolchain: Toolchain, framework: Framework | null, addons: Addon[]) =>
  [...(framework ? [framework] : []), ...addons].flatMap(
    (name) => FORMAT_ENTRIES[toolchain][name] ?? [],
  )

/** Imports the `base` entry as `santux` and the other entries, sorted by path as the import order rules expect. */
const importLines = (toolchain: Toolchain, base: string, entries: string[]) =>
  [['santux', base] as const, ...entries.map((entry) => [camelCase(entry), entry] as const)]
    .sort(([, a], [, b]) => (a < b ? -1 : 1))
    .map(([name, entry]) => `import ${name} from '${TOOLCHAIN_PACKAGE[toolchain]}/${entry}'\n`)
    .join('')

function eslintConfig(framework: Framework | null, addons: Addon[]) {
  const entries = lintEntries(framework, addons)

  return `${importLines('eslint', 'lint', entries)}import { defineConfig } from 'eslint/config'

export default defineConfig([${['santux', ...entries.map(camelCase)].join(', ')}])
`
}

function oxlintConfig(framework: Framework | null, addons: Addon[]) {
  const entries = lintEntries(framework, addons)

  const ignorePatterns = [
    ...OXLINT_IGNORE_PATTERNS.base,
    ...(framework ? OXLINT_IGNORE_PATTERNS[framework] : []),
  ]

  return `${importLines('oxc', 'lint', entries)}import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [${['santux', ...entries.map(camelCase)].join(', ')}],
  ignorePatterns: [${ignorePatterns.map((pattern) => `'${pattern}'`).join(', ')}],
})
`
}

function prettierConfig(framework: Framework | null, addons: Addon[]) {
  const entries = formatEntries('eslint', framework, addons)

  if (entries.length === 0) return reexport('eslint', 'format')

  const spreads = ['santux', ...entries.map(camelCase)].map((name) => `...${name}`)

  if (entries.length === 1) {
    return `${importLines('eslint', 'format', entries)}
export default { ${spreads.join(', ')} }
`
  }

  const plugins = entries.map((entry) => `...${camelCase(entry)}.plugins`).join(', ')

  return `${importLines('eslint', 'format', entries)}
export default {
${[...spreads, `plugins: [${plugins}]`].map((line) => `  ${line},\n`).join('')}}
`
}

function oxfmtConfig(framework: Framework | null, addons: Addon[]) {
  const entries = formatEntries('oxc', framework, addons)

  if (entries.length === 0) return reexport('oxc', 'format')

  return `${importLines('oxc', 'format', entries)}import { defineConfig } from 'oxfmt'

export default defineConfig({ ...${['santux', ...entries.map(camelCase)].join(', ...')} })
`
}

function commonFiles(toolchain: Toolchain, framework: Framework | null): Record<string, string> {
  const formatIgnores = [
    'build',
    'dist',
    ...Object.keys(LOCKFILES).sort(),
    ...((framework && FORMAT_IGNORE_PATTERNS[framework]) ?? []),
  ]

  return {
    [COMMITLINT_CONFIG_PATH]: reexport(toolchain, 'commitlint'),
    [HUSKY_HOOK_PATH]: 'npx --no -- commitlint --edit $1\n',
    '.editorconfig': EDITORCONFIG,
    '.prettierignore': `${formatIgnores.join('\n')}\n`,
  }
}

function toolchainFiles({ addons, framework, toolchain }: Choices): Record<string, string> {
  return toolchain === 'eslint'
    ? {
        'eslint.config.js': eslintConfig(framework, addons),
        'prettier.config.js': prettierConfig(framework, addons),
      }
    : {
        'oxlint.config.ts': oxlintConfig(framework, addons),
        'oxfmt.config.ts': oxfmtConfig(framework, addons),
      }
}

/** Manual steps to wire the newly selected Framework and Add-on entries into configs that already exist. */
function newEntrySteps(choices: Choices, configs: Record<string, string>) {
  const { addons, framework, toolchain } = choices
  const [lintPath, formatPath] = TOOLCHAIN_CONFIG_PATHS[toolchain]
  const entryPackage = TOOLCHAIN_PACKAGE[toolchain]

  const isMissing = (path: string, entry: string) =>
    path in configs && !configs[path]?.includes(`${entryPackage}/${entry}`)

  const importLine = (entry: string) =>
    `\`import ${camelCase(entry)} from '${entryPackage}/${entry}'\``

  const steps: string[] = []
  const lintTarget = toolchain === 'eslint' ? `the \`defineConfig([...])\` array` : '`extends`'

  for (const entry of lintEntries(framework, addons).filter((name) => isMissing(lintPath, name))) {
    const ignorePatterns =
      toolchain === 'oxc' && entry === framework
        ? `, plus these \`ignorePatterns\`: ${[
            ...OXLINT_IGNORE_PATTERNS.base,
            ...OXLINT_IGNORE_PATTERNS[framework],
          ]
            .map((pattern) => `\`${pattern}\``)
            .join(', ')} if they are missing`
        : ''

    steps.push(
      `Add ${importLine(entry)} to ${lintPath} and \`${camelCase(entry)}\` to ${lintTarget}${ignorePatterns}`,
    )
  }

  const entries = formatEntries(toolchain, framework, addons)
  const missingFormatEntries = entries.filter((name) => isMissing(formatPath, name))

  if (missingFormatEntries.length === 0) return steps

  if (configs[formatPath]?.trim() === reexport(toolchain, 'format').trim()) {
    steps.push(`Replace ${formatPath} with:\n${toolchainFiles(choices)[formatPath] ?? ''}`)

    return steps
  }

  // a later Prettier entry's `plugins` replaces the earlier ones when spread
  const pluginsMerge =
    toolchain === 'eslint' && entries.length > 1
      ? `, then set its \`plugins\` to \`[${entries.map((entry) => `...${camelCase(entry)}.plugins`).join(', ')}]\``
      : ''

  for (const entry of missingFormatEntries) {
    steps.push(
      `Add ${importLine(entry)} to ${formatPath} and spread \`...${camelCase(entry)}\` into its exported config${pluginsMerge}`,
    )
  }

  return steps
}

export const NO_PACKAGE_JSON_ERROR = 'No package.json found in the current directory'

/** shortcut: only handles `>=x[.y[.z]]` ranges, extend if the package ever uses another range form. */
function isVersionBelow(version: string, range: string) {
  const minimum = /^>=\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range)

  if (!minimum) return false

  const required = minimum.slice(1).map((part) => Number(part || 0))

  const running = version
    .replace(/^v/, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10))

  for (const [index, value] of required.entries()) {
    const current = running[index] ?? 0

    if (current !== value) return current < value
  }

  return false
}

/**
 * Sets the minimum release age to a day in the project config of the package manager,
 * unless a project config file already sets it, whatever the value.
 */
function planMinimumReleaseAge(
  packageManager: PackageManager,
  configs: Record<string, string>,
  version: string | null,
): { operation?: Operation; warning?: string } {
  const { line, path, section, setting, since } = MINIMUM_RELEASE_AGE[packageManager]

  if (Object.values(configs).some((content) => setting.test(content))) return {}

  if (!version || isVersionBelow(version, `>=${since}`)) {
    return {
      warning: `The minimum release age was not set, since it needs ${packageManager} ${since} or later and found ${version ?? 'an unknown version'}`,
    }
  }

  const current = configs[path]?.trimEnd()
  const lines = current ? current.split('\n') : []
  const sectionIndex = section ? lines.findIndex((text) => text.trim() === section) : -1

  if (sectionIndex === -1) {
    lines.push(...(section ? [section] : []), line)
  } else {
    lines.splice(sectionIndex + 1, 0, line)
  }

  return { operation: { type: 'set-minimum-release-age', path, content: `${lines.join('\n')}\n` } }
}

const NODE_VERSION_FILE = '.node-version'

/** Paths of the files the Tooling layer writes, whichever Toolchain is chosen. */
export const TOOLING_FILE_PATHS = [
  ...Object.keys(commonFiles('eslint', null)),
  ...Object.values(TOOLCHAIN_CONFIG_PATHS).flat(),
  NODE_VERSION_FILE,
]

/**
 * Builds the plan to apply the base Tooling layer, plus the selected Framework rules and Add-ons, with the chosen Toolchain.
 * Pure: every external input arrives through the arguments.
 */
export function plan(
  snapshot: Snapshot,
  choices: Choices,
  metadata: ToolchainMetadata,
  environment: Environment,
): Plan {
  const warnings: string[] = []
  const manualSteps: string[] = []
  const errors: string[] = []

  if (!snapshot.hasPackageJson) {
    errors.push(NO_PACKAGE_JSON_ERROR)
  }

  const nodeRange = metadata.engines?.node

  if (nodeRange && isVersionBelow(environment.nodeVersion, nodeRange)) {
    errors.push(
      `${metadata.name} requires Node ${nodeRange}, but you are running ${environment.nodeVersion}`,
    )
  }

  const unrecognizedHuskyFiles = snapshot.huskyFiles.filter((path) => path !== HUSKY_HOOK_PATH)

  if (unrecognizedHuskyFiles.length > 0) {
    errors.push(
      `Found unrecognized files in .husky/: ${unrecognizedHuskyFiles.join(', ')}. Remove or migrate them and run santux again`,
    )
  }

  const { toolchain } = choices

  const files = {
    ...toolchainFiles(choices),
    ...commonFiles(toolchain, choices.framework),
    [NODE_VERSION_FILE]: getNodeVersion(environment),
  }

  const selectedPeers: readonly string[] = [
    ...(choices.framework ? FRAMEWORK_PEERS[choices.framework] : []),
    ...choices.addons.flatMap((addon) => ADDON_PEERS[addon]),
  ]

  const peers = Object.entries(metadata.peerDependencies ?? {}).filter(
    ([name]) =>
      metadata.peerDependenciesMeta?.[name]?.optional !== true || selectedPeers.includes(name),
  )

  const requiredDependencies: [string, string][] = [[metadata.name, metadata.version], ...peers]

  const otherToolchainPaths = Object.entries(TOOLCHAIN_CONFIG_PATHS).flatMap(([name, paths]) =>
    name === toolchain ? [] : paths,
  )

  const operations: Operation[] = [
    ...snapshot.conflictFiles,
    ...snapshot.existingFiles.filter((path) => otherToolchainPaths.includes(path)),
  ].map((path) => ({ type: 'delete-file', path }))

  if (snapshot.hasPrettierKey) {
    operations.push({ type: 'remove-package-json-key', key: 'prettier' })
  }

  // the written configs use ESM syntax in .js and .ts files
  if (!snapshot.isModule) {
    operations.push({ type: 'set-module-type' })

    if (snapshot.rootJsFiles.length > 0) {
      warnings.push(
        `Setting "type": "module" makes Node load ${snapshot.rootJsFiles.join(', ')} as ES modules. Rename any that use require or module.exports to .cjs`,
      )
    }
  }

  const switchesToolchain = snapshot.existingFiles.some((path) =>
    otherToolchainPaths.includes(path),
  )

  const isRerun =
    !switchesToolchain &&
    TOOLCHAIN_CONFIG_PATHS[toolchain].some((path) => snapshot.existingFiles.includes(path))

  const dependencies: Record<string, string> = Object.fromEntries(
    requiredDependencies.filter(
      ([name, version]) => !isRerun || snapshot.dependencyVersions[name] !== version,
    ),
  )

  const conflictingDependencies = isRerun
    ? []
    : snapshot.dependencies.filter(
        (name) =>
          (CONFLICT_DEPENDENCY.test(name) ||
            Object.values<string>(TOOLCHAIN_PACKAGE).includes(name)) &&
          !(name in dependencies),
      )

  if (conflictingDependencies.length > 0) {
    operations.push({ type: 'remove-dependencies', dependencies: conflictingDependencies })
  }

  for (const [path, content] of Object.entries(files)) {
    if (!snapshot.existingFiles.includes(path)) {
      operations.push({ type: 'create-file', path, content })
    } else if (switchesToolchain && path === COMMITLINT_CONFIG_PATH) {
      // the old one imports the Toolchain package that is being removed
      operations.push({ type: 'update-file', path, content })
    } else if (!isRerun) {
      warnings.push(`${path} already exists and was left untouched`)
    }
  }

  if (isRerun) {
    manualSteps.push(...newEntrySteps(choices, snapshot.toolchainConfigs))
  }

  if (choices.alias) {
    const alias = planAlias(snapshot, choices.framework)

    operations.push(...alias.operations)
    warnings.push(...alias.warnings)
    manualSteps.push(...alias.manualSteps)
  }

  // shortcut: a re-run never touches scripts, so a missing one stays missing, upgrade if partial setups matter
  if (!isRerun) {
    const scripts = SCRIPTS[toolchain]

    const replaced = Object.keys(scripts).filter(
      (name) => name in snapshot.scripts && snapshot.scripts[name] !== scripts[name],
    )

    if (replaced.length > 0) {
      warnings.push(
        `package.json scripts replaced: ${replaced
          .map((name) => `${name} (was \`${snapshot.scripts[name] ?? ''}\`)`)
          .join(', ')}`,
      )
    }

    operations.push({ type: 'set-scripts', scripts })
  }

  const typescriptVersion = toolchain === 'eslint' ? snapshot.typescriptVersion : null
  const typescriptMajor = Number(/\d+/.exec(typescriptVersion ?? '')?.[0])

  if (typescriptVersion && Number.isNaN(typescriptMajor)) {
    warnings.push(
      `Could not tell the TypeScript version from "${typescriptVersion}". Install your dependencies and run santux again so TypeScript 7 gets TypeScript 6 side by side`,
    )
  } else if (typescriptVersion && typescriptMajor >= 7) {
    const compatVersion = metadata.peerDependencies?.[TYPESCRIPT_COMPAT_PACKAGE]

    if (compatVersion) {
      const typescriptAliases = {
        typescript: `npm:${TYPESCRIPT_COMPAT_PACKAGE}@${compatVersion}`,
        [TYPESCRIPT_7_ALIAS]: `npm:typescript@${typescriptVersion}`,
      }

      if (choices.packageManager === 'npm') {
        // npm links `.bin/tsc` to TypeScript 6 when both aliases are installed, so it is left to the user
        manualSteps.push(
          `TypeScript ${typescriptVersion} needs TypeScript 6 side by side for type-aware lint rules. Replace your TypeScript dependency in package.json with ${Object.entries(
            typescriptAliases,
          )
            .map(([name, spec]) => `"${name}": "${spec}"`)
            .join(
              ', ',
            )}. npm then links \`tsc\` to TypeScript 6, so run TypeScript 7 as \`node_modules/${TYPESCRIPT_7_ALIAS}/bin/tsc\``,
        )
      } else {
        Object.assign(dependencies, typescriptAliases)
      }
    } else {
      warnings.push(
        `${metadata.name} declares no ${TYPESCRIPT_COMPAT_PACKAGE} peer, so TypeScript ${typescriptVersion} was left as is and type-aware lint rules may fail`,
      )
    }
  }

  if (Object.keys(dependencies).length > 0) {
    operations.push({ type: 'add-dev-dependencies', dependencies })
  }

  const releaseAge = planMinimumReleaseAge(
    choices.packageManager,
    snapshot.packageManagerConfigs,
    environment.packageManagerVersion,
  )

  if (releaseAge.operation) operations.push(releaseAge.operation)
  if (releaseAge.warning) warnings.push(releaseAge.warning)

  if (!snapshot.hasGit) {
    manualSteps.push(
      `Run \`git init\` and then \`${choices.packageManager} run prepare\` to enable git hooks`,
    )
  }

  return { errors, manualSteps, operations: errors.length > 0 ? [] : operations, warnings }
}
